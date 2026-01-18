import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  try {
    // Using Finnhub API for stock search (free tier: 60 calls/minute)
    // Get API key from: https://finnhub.io/register
    const apiKey = process.env.FINNHUB_API_KEY || ''
    
    if (!apiKey) {
      // Fallback to Yahoo Finance search if no API key
      const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      
      try {
        const response = await fetch(yahooUrl)
        const data = await response.json()
        
        const stocks = (data.quotes || [])
          .filter((quote: any) => quote.quoteType === 'EQUITY' && quote.exchange?.includes('NYSE') || quote.exchange?.includes('NASDAQ'))
          .map((quote: any) => ({
            symbol: quote.symbol,
            name: quote.shortname || quote.longname || quote.symbol,
            type: 'Equity',
            region: 'United States',
            currency: 'USD',
            matchScore: '1.0',
          }))
          .slice(0, 10)
        
        return NextResponse.json({ stocks })
      } catch (yahooError) {
        return NextResponse.json({ error: 'Stock search service unavailable. Please try again later.' }, { status: 500 })
      }
    }

    // Use Finnhub if API key is provided
    const searchUrl = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`
    const response = await fetch(searchUrl)
    const data = await response.json()

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 })
    }

    const matches = data.result || []

    // Filter for US stocks and format the response
    const stocks = matches
      .filter((match: any) => match.type === 'Common Stock' && match.displaySymbol && !match.displaySymbol.includes('.'))
      .map((match: any) => ({
        symbol: match.displaySymbol || match.symbol,
        name: match.description || match.symbol,
        type: match.type || 'Equity',
        region: 'United States',
        currency: 'USD',
        matchScore: '1.0',
      }))
      .slice(0, 10) // Limit to 10 results

    return NextResponse.json({ stocks })
  } catch (error: any) {
    console.error('Stock search error:', error)
    return NextResponse.json(
      { error: 'Failed to search stocks. Please try again.' },
      { status: 500 }
    )
  }
}
