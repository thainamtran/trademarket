import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // Try to get auth token from Authorization header first
    const authHeader = request.headers.get('Authorization')
    let supabase = createClient()
    let user = null
    let authError = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabaseWithToken = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        }
      )
      
      const { data: { user: tokenUser }, error: tokenError } = await supabaseWithToken.auth.getUser(token)
      user = tokenUser
      authError = tokenError
      
      if (user) {
        supabase = supabaseWithToken
      }
    } else {
      const result = await supabase.auth.getUser()
      user = result.data.user
      authError = result.error
    }
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, quantity } = body

    // Validate input
    if (!symbol || !symbol.trim()) {
      return NextResponse.json({ error: 'Stock symbol is required' }, { status: 400 })
    }

    const shares = parseFloat(quantity)
    if (!shares || shares <= 0 || !isFinite(shares)) {
      return NextResponse.json({ error: 'Valid quantity (number of shares) is required' }, { status: 400 })
    }

    // Get current stock price
    const cleanSymbol = symbol.toUpperCase().trim()
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const quoteResponse = await fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(cleanSymbol)}`)
    const quoteData = await quoteResponse.json()

    if (!quoteData.quote || !quoteData.quote.price) {
      return NextResponse.json({ error: 'Could not fetch current stock price. Please try again.' }, { status: 400 })
    }

    const currentPrice = parseFloat(quoteData.quote.price)
    const totalValue = currentPrice * shares

    // Get user's holdings for this symbol
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('id, quantity, purchase_price')
      .eq('user_id', user.id)
      .eq('symbol', cleanSymbol)
      .order('purchase_date', { ascending: true }) // Sell oldest first (FIFO)

    if (holdingsError || !holdings) {
      return NextResponse.json({ error: 'Could not retrieve your holdings' }, { status: 500 })
    }

    // Calculate total quantity owned
    const totalOwned = holdings.reduce((sum, h) => sum + parseFloat(h.quantity.toString()), 0)

    if (totalOwned < shares) {
      return NextResponse.json({ 
        error: `Insufficient shares. You own ${totalOwned.toFixed(4)} shares, but trying to sell ${shares.toFixed(4)} shares.` 
      }, { status: 400 })
    }

    // Get user profile to update balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_balance, total_value')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not retrieve user balance' }, { status: 500 })
    }

    const currentBalance = parseFloat(profile.current_balance.toString())

    // Calculate average purchase price for sold shares
    let remainingToSell = shares
    let totalCost = 0
    const holdingsToUpdate: { id: string; newQuantity: number }[] = []
    const holdingsToDelete: string[] = []

    // Sell using FIFO (First In, First Out)
    for (const holding of holdings) {
      if (remainingToSell <= 0) break

      const holdingQuantity = parseFloat(holding.quantity.toString())
      const holdingPrice = parseFloat(holding.purchase_price.toString())

      if (holdingQuantity <= remainingToSell) {
        // Sell entire holding
        totalCost += holdingQuantity * holdingPrice
        remainingToSell -= holdingQuantity
        holdingsToDelete.push(holding.id)
      } else {
        // Sell partial holding
        totalCost += remainingToSell * holdingPrice
        const newQuantity = holdingQuantity - remainingToSell
        holdingsToUpdate.push({ id: holding.id, newQuantity })
        remainingToSell = 0
      }
    }

    const averageCost = totalCost / shares
    const profitLoss = totalValue - totalCost

    // Update user balance
    const newBalance = currentBalance + totalValue
    const newTotalValue = parseFloat(profile.total_value.toString()) - totalCost + (currentPrice * shares) // Remove old cost, but total value doesn't change much since we're just converting holdings to cash

    // Actually, let's recalculate total_value properly: current cash + (holdings value)
    // But we need to know remaining holdings value, so let's simplify:
    // Remove the sold shares' cost from total_value, add cash proceeds
    // This is an approximation - proper calculation would need all remaining holdings' current values
    const updatedTotalValue = parseFloat(profile.total_value.toString()) - (totalCost) + totalValue

    // Update profile balance
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_balance: newBalance.toFixed(2),
        total_value: updatedTotalValue.toFixed(2),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
    }

    // Update or delete holdings
    for (const update of holdingsToUpdate) {
      const { error: updateHoldingError } = await supabase
        .from('holdings')
        .update({ quantity: update.newQuantity.toFixed(4) })
        .eq('id', update.id)

      if (updateHoldingError) {
        console.error('Holding update error:', updateHoldingError)
        // Rollback balance update
        await supabase
          .from('profiles')
          .update({
            current_balance: currentBalance.toFixed(2),
            total_value: profile.total_value,
          })
          .eq('id', user.id)
        
        return NextResponse.json({ error: 'Failed to update holdings' }, { status: 500 })
      }
    }

    for (const id of holdingsToDelete) {
      const { error: deleteError } = await supabase
        .from('holdings')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Holding delete error:', deleteError)
        // Rollback balance update
        await supabase
          .from('profiles')
          .update({
            current_balance: currentBalance.toFixed(2),
            total_value: profile.total_value,
          })
          .eq('id', user.id)
        
        return NextResponse.json({ error: 'Failed to delete holdings' }, { status: 500 })
      }
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        symbol: cleanSymbol,
        transaction_type: 'sell',
        quantity: shares,
        price: currentPrice,
        total_amount: totalValue,
      })

    if (transactionError) {
      console.error('Transaction insert error:', transactionError)
      // Transaction recording failed, but sale was successful, so we don't rollback
      // Just log the error
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sold ${shares} shares of ${cleanSymbol} at $${currentPrice.toFixed(2)} per share`,
      sale: {
        symbol: cleanSymbol,
        quantity: shares,
        price: currentPrice,
        totalValue: totalValue,
        averageCost: averageCost,
        profitLoss: profitLoss,
        newBalance: newBalance,
      },
    })

  } catch (error: any) {
    console.error('Sell stock error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
