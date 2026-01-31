import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface BalanceData {
  date: string
  cashBalance: number
  portfolioValue: number
}

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

    // Get user profile to get initial balance
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('initial_balance, current_balance, total_value')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Get all transactions ordered by date
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_type, quantity, price, total_amount, transaction_date')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: true })

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Calculate cash balance over time
    let currentCashBalance = profile.initial_balance
    const balanceHistory: BalanceData[] = []
    
    // Add initial balance point
    if (transactions && transactions.length > 0) {
      const firstTransactionDate = transactions[0].transaction_date
      balanceHistory.push({
        date: firstTransactionDate.split('T')[0],
        cashBalance: profile.initial_balance,
        portfolioValue: profile.initial_balance, // We'll update this with current portfolio value
      })
    }

    // Process transactions chronologically
    if (transactions && transactions.length > 0) {
      for (const transaction of transactions) {
        if (transaction.transaction_type === 'buy') {
          currentCashBalance -= transaction.total_amount
        } else if (transaction.transaction_type === 'sell') {
          currentCashBalance += transaction.total_amount
        }

        const date = transaction.transaction_date.split('T')[0]
        
        // Check if we already have an entry for this date
        const existingEntry = balanceHistory.find(b => b.date === date)
        if (existingEntry) {
          existingEntry.cashBalance = currentCashBalance
        } else {
          balanceHistory.push({
            date,
            cashBalance: currentCashBalance,
            portfolioValue: currentCashBalance, // Will be updated with holdings value
          })
        }
      }
    }

    // Get current holdings to calculate current portfolio value
    const { data: holdings } = await supabase
      .from('holdings')
      .select('symbol, quantity, purchase_price')
      .eq('user_id', user.id)

    // Calculate current portfolio value
    const currentPortfolioValue = profile.current_balance + (profile.total_value - profile.current_balance)
    
    // Add today's data point with current portfolio value
    const today = new Date().toISOString().split('T')[0]
    const todayEntry = balanceHistory.find(b => b.date === today)
    if (todayEntry) {
      todayEntry.cashBalance = profile.current_balance
      todayEntry.portfolioValue = profile.total_value
    } else {
      balanceHistory.push({
        date: today,
        cashBalance: profile.current_balance,
        portfolioValue: profile.total_value,
      })
    }

    // For historical dates, we approximate portfolio value as cash balance
    // (since we don't have historical stock prices)
    // This gives us cash balance trend, which is still useful
    for (const entry of balanceHistory) {
      if (entry.date !== today) {
        // Approximate: portfolio value = cash balance (we don't have historical stock prices)
        // This shows cash flow over time
        entry.portfolioValue = entry.cashBalance
      }
    }

    // Sort by date
    balanceHistory.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      balanceHistory,
      currentBalance: profile.current_balance,
      currentPortfolioValue: profile.total_value,
      initialBalance: profile.initial_balance,
    })
  } catch (error: any) {
    console.error('Portfolio balance API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
