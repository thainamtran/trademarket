import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol || symbol.trim().length === 0) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
  }

  try {
    // Using Alpha Vantage API for real-time quotes
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo'
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`

    const response = await fetch(quoteUrl)
    const data = await response.json()

    if (data['Error Message']) {
      return NextResponse.json({ error: data['Error Message'] }, { status: 400 })
    }

    if (data['Note']) {
      return NextResponse.json({ error: 'API rate limit exceeded. Please try again later.' }, { status: 429 })
    }

    const quote = data['Global Quote']

    if (!quote || Object.keys(quote).length === 0) {
      return NextResponse.json({ error: 'Stock symbol not found' }, { status: 404 })
    }

    // Format the quote data
    const stockQuote = {
      symbol: quote['01. symbol'],
      open: quote['02. open'],
      high: quote['03. high'],
      low: quote['04. low'],
      price: quote['05. price'],
      volume: quote['06. volume'],
      latestTradingDay: quote['07. latest trading day'],
      previousClose: quote['08. previous close'],
      change: quote['09. change'],
      changePercent: quote['10. change percent'],
    }

    return NextResponse.json({ quote: stockQuote })
  } catch (error: any) {
    console.error('Stock quote error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock quote. Please try again.' },
      { status: 500 }
    )
  }
}
