import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol || symbol.trim().length === 0) {
    return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 })
  }

  try {
    // Using Yahoo Finance API (no API key required, no rate limits)
    const cleanSymbol = symbol.toUpperCase().trim()
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSymbol)}?interval=1d&range=1d`

    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch stock data from provider.' }, { status: response.status })
    }

    const data = await response.json()

    const result = data.chart?.result?.[0]
    
    if (!result) {
      return NextResponse.json({ 
        error: `Stock symbol "${cleanSymbol}" not found. Please check the symbol and try again.` 
      }, { status: 404 })
    }

    const meta = result.meta || {}
    const currentPrice = meta.regularMarketPrice || meta.previousClose
    
    if (!currentPrice && currentPrice !== 0) {
      return NextResponse.json({ 
        error: `No current price data available for "${cleanSymbol}". The stock may not exist or markets may be closed.` 
      }, { status: 404 })
    }

    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose !== 0 ? ((change / previousClose) * 100).toFixed(2) : '0.00'

    // Format the quote data
    const stockQuote = {
      symbol: cleanSymbol,
      open: (meta.regularMarketDayLow && meta.regularMarketOpen) ? meta.regularMarketOpen.toString() : previousClose.toString(),
      high: meta.regularMarketDayHigh ? meta.regularMarketDayHigh.toString() : currentPrice.toString(),
      low: meta.regularMarketDayLow ? meta.regularMarketDayLow.toString() : currentPrice.toString(),
      price: currentPrice.toString(),
      volume: meta.regularMarketVolume ? meta.regularMarketVolume.toString() : '0',
      latestTradingDay: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      previousClose: previousClose.toString(),
      change: change.toFixed(2),
      changePercent: `${change >= 0 ? '+' : ''}${changePercent}%`,
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
