import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface HistoricalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const period = searchParams.get('period') || '1mo' // 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
    }

    // Calculate date range based on period
    const endDate = Math.floor(Date.now() / 1000)
    let startDate = endDate
    
    switch (period) {
      case '1d':
        startDate = endDate - (1 * 24 * 60 * 60) // 1 day
        break
      case '5d':
        startDate = endDate - (5 * 24 * 60 * 60) // 5 days
        break
      case '1mo':
        startDate = endDate - (30 * 24 * 60 * 60) // 30 days
        break
      case '3mo':
        startDate = endDate - (90 * 24 * 60 * 60) // 90 days
        break
      case '6mo':
        startDate = endDate - (180 * 24 * 60 * 60) // 180 days
        break
      case '1y':
        startDate = endDate - (365 * 24 * 60 * 60) // 1 year
        break
      case '2y':
        startDate = endDate - (730 * 24 * 60 * 60) // 2 years
        break
      case '5y':
        startDate = endDate - (1825 * 24 * 60 * 60) // 5 years
        break
      case 'ytd':
        const yearStart = new Date(new Date().getFullYear(), 0, 1)
        startDate = Math.floor(yearStart.getTime() / 1000)
        break
      default:
        startDate = endDate - (30 * 24 * 60 * 60) // Default to 1 month
    }

    // Use Yahoo Finance API for historical data
    // Format: https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range={period}
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${period}`
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch historical data' },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      return NextResponse.json(
        { error: 'No historical data found for this symbol' },
        { status: 404 }
      )
    }

    const result = data.chart.result[0]
    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}

    if (!quotes.close || timestamps.length === 0) {
      return NextResponse.json(
        { error: 'Invalid historical data format' },
        { status: 500 }
      )
    }

    // Format the data
    const historicalData: HistoricalData[] = timestamps.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: quotes.open?.[index] || 0,
      high: quotes.high?.[index] || 0,
      low: quotes.low?.[index] || 0,
      close: quotes.close?.[index] || 0,
      volume: quotes.volume?.[index] || 0,
    })).filter((item: HistoricalData) => item.close > 0) // Filter out invalid data

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      period,
      data: historicalData,
    })
  } catch (error: any) {
    console.error('Historical data API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
