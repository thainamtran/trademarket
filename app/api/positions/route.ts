import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
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

    // Fetch all holdings for the user
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('id, symbol, quantity, purchase_price, purchase_date')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false })

    if (holdingsError) {
      console.error('Holdings fetch error:', holdingsError)
      return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 })
    }

    if (!holdings || holdings.length === 0) {
      return NextResponse.json({ positions: [] })
    }

    // Aggregate holdings by symbol (combine multiple purchases of same stock)
    const positionsMap = new Map<string, {
      symbol: string
      totalQuantity: number
      averagePrice: number
      purchaseDates: string[]
      holdingIds: string[]
    }>()

    for (const holding of holdings) {
      const symbol = holding.symbol
      const quantity = parseFloat(holding.quantity.toString())
      const price = parseFloat(holding.purchase_price.toString())

      if (positionsMap.has(symbol)) {
        const existing = positionsMap.get(symbol)!
        const totalCost = (existing.averagePrice * existing.totalQuantity) + (price * quantity)
        existing.totalQuantity += quantity
        existing.averagePrice = totalCost / existing.totalQuantity
        existing.purchaseDates.push(holding.purchase_date)
        existing.holdingIds.push(holding.id)
      } else {
        positionsMap.set(symbol, {
          symbol,
          totalQuantity: quantity,
          averagePrice: price,
          purchaseDates: [holding.purchase_date],
          holdingIds: [holding.id],
        })
      }
    }

    // Get current prices for all symbols
    const symbols = Array.from(positionsMap.keys())
    const url = new URL(request.url)
    const baseUrl = `${url.protocol}//${url.host}`
    
    const positionPromises = symbols.map(async (symbol) => {
      try {
        const quoteResponse = await fetch(`${baseUrl}/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const quoteData = await quoteResponse.json()
        
        const position = positionsMap.get(symbol)!
        const currentPrice = quoteData.quote?.price ? parseFloat(quoteData.quote.price) : position.averagePrice
        
        const totalValue = position.totalQuantity * currentPrice
        const totalCost = position.totalQuantity * position.averagePrice
        const profitLoss = totalValue - totalCost
        const profitLossPercent = totalCost > 0 ? ((profitLoss / totalCost) * 100) : 0

        return {
          symbol: position.symbol,
          quantity: position.totalQuantity,
          averagePrice: position.averagePrice,
          currentPrice: currentPrice,
          totalValue: totalValue,
          totalCost: totalCost,
          profitLoss: profitLoss,
          profitLossPercent: profitLossPercent,
          purchaseDates: position.purchaseDates,
        }
      } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error)
        // Return position with purchase price as current price if quote fails
        const position = positionsMap.get(symbol)!
        return {
          symbol: position.symbol,
          quantity: position.totalQuantity,
          averagePrice: position.averagePrice,
          currentPrice: position.averagePrice,
          totalValue: position.totalQuantity * position.averagePrice,
          totalCost: position.totalQuantity * position.averagePrice,
          profitLoss: 0,
          profitLossPercent: 0,
          purchaseDates: position.purchaseDates,
        }
      }
    })

    const positions = await Promise.all(positionPromises)

    return NextResponse.json({ positions })
  } catch (error: any) {
    console.error('Positions API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
