import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  try {
    // Using Alpha Vantage API for stock search (free tier)
    // Get API key from: https://www.alphavantage.co/support/#api-key
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo'
    const searchUrl = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`

    const response = await fetch(searchUrl)
    const data = await response.json()

    if (data['Error Message']) {
      return NextResponse.json({ error: data['Error Message'] }, { status: 400 })
    }

    if (data['Note']) {
      // Rate limit message
      return NextResponse.json({ error: 'API rate limit exceeded. Please try again later.' }, { status: 429 })
    }

    const matches = data.bestMatches || []

    // Filter for US stocks only and format the response
    const stocks = matches
      .filter((match: any) => match['4. region'] === 'United States')
      .map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        type: match['3. type'],
        region: match['4. region'],
        marketOpen: match['5. marketOpen'],
        marketClose: match['6. marketClose'],
        timezone: match['7. timezone'],
        currency: match['8. currency'],
        matchScore: match['9. matchScore'],
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
