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
      // If we have a token in the header, use it directly
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
      
      // Use the token-based client for subsequent operations
      if (user) {
        supabase = supabaseWithToken
      }
    } else {
      // Fall back to cookie-based authentication
      const result = await supabase.auth.getUser()
      user = result.data.user
      authError = result.error
    }
    
    if (authError) {
      console.error('Auth error in buy route:', authError)
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }
    
    if (!user) {
      console.error('No user found in buy route')
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
    
    // Construct the quote API URL
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const quoteResponse = await fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(cleanSymbol)}`)
    const quoteData = await quoteResponse.json()

    if (!quoteData.quote || !quoteData.quote.price) {
      return NextResponse.json({ error: 'Could not fetch current stock price. Please try again.' }, { status: 400 })
    }

    const currentPrice = parseFloat(quoteData.quote.price)
    const totalCost = currentPrice * shares

    // Get user profile to check balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_balance, total_value')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Could not retrieve user balance' }, { status: 500 })
    }

    const currentBalance = parseFloat(profile.current_balance.toString())

    // Check if user has enough balance
    if (currentBalance < totalCost) {
      return NextResponse.json({ 
        error: `Insufficient balance. You have $${currentBalance.toFixed(2)}, but need $${totalCost.toFixed(2)} for ${shares} shares.` 
      }, { status: 400 })
    }

    // Update user balance
    const newBalance = currentBalance - totalCost
    const newTotalValue = parseFloat(profile.total_value.toString()) - totalCost + (currentPrice * shares) // Value doesn't change, we're just moving cash to holdings

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        current_balance: newBalance.toFixed(2),
        total_value: newTotalValue.toFixed(2),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 })
    }

    // Record the purchase in holdings
    const { data: holding, error: holdingError } = await supabase
      .from('holdings')
      .insert({
        user_id: user.id,
        symbol: cleanSymbol,
        quantity: shares,
        purchase_price: currentPrice,
      })
      .select()
      .single()

    if (holdingError) {
      console.error('Holding insert error:', holdingError)
      // Rollback balance update if holding insert fails
      await supabase
        .from('profiles')
        .update({
          current_balance: currentBalance.toFixed(2),
          total_value: profile.total_value,
        })
        .eq('id', user.id)
      
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }

    // Record transaction
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        symbol: cleanSymbol,
        transaction_type: 'buy',
        quantity: shares,
        price: currentPrice,
        total_amount: totalCost,
      })

    if (transactionError) {
      console.error('Transaction insert error:', transactionError)
      // Transaction recording failed, but purchase was successful, so we don't rollback
      // Just log the error
    }

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${shares} shares of ${cleanSymbol} at $${currentPrice.toFixed(2)} per share`,
      purchase: {
        symbol: cleanSymbol,
        quantity: shares,
        price: currentPrice,
        totalCost: totalCost,
        newBalance: newBalance,
      },
    })

  } catch (error: any) {
    console.error('Buy stock error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
