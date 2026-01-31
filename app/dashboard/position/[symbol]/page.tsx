'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface StockQuote {
  symbol: string
  open: string
  high: string
  low: string
  price: string
  volume: string
  latestTradingDay: string
  previousClose: string
  change: string
  changePercent: string
}

interface Position {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  totalValue: number
  totalCost: number
  profitLoss: number
  profitLossPercent: number
}

export default function PositionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const symbol = params.symbol as string
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [position, setPosition] = useState<Position | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buyQuantity, setBuyQuantity] = useState<string>('1')
  const [sellQuantity, setSellQuantity] = useState<string>('')
  const [buying, setBuying] = useState(false)
  const [selling, setSelling] = useState(false)
  const [buySuccess, setBuySuccess] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [sellSuccess, setSellSuccess] = useState<string | null>(null)
  const [sellError, setSellError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndLoadData = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabaseClient.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // Load stock quote
        const quoteResponse = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const quoteData = await quoteResponse.json()

        if (!quoteResponse.ok || quoteData.error) {
          const errorMessage = quoteData.error || 'Failed to load stock information'
          console.error('Stock quote API error:', { status: quoteResponse.status, error: errorMessage })
          setError(errorMessage)
        } else if (quoteData.quote) {
          setQuote(quoteData.quote)
        } else {
          setError('No stock data received from server')
        }

        // Load user's position
        const positionsResponse = await fetch('/api/positions', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        const positionsData = await positionsResponse.json()

        if (positionsResponse.ok && positionsData.positions) {
          const userPosition = positionsData.positions.find((p: Position) => p.symbol === symbol.toUpperCase())
          if (userPosition) {
            setPosition(userPosition)
            setSellQuantity(userPosition.quantity.toString())
          }
        }
      } catch (err) {
        setError('Failed to load stock information. Please try again.')
        console.error('Position detail error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      checkAuthAndLoadData()
    }
  }, [symbol, router])

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const formatNumber = (value: string) => {
    const num = parseFloat(value)
    return new Intl.NumberFormat('en-US').format(num)
  }

  const handleBuyStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setBuying(true)
    setBuyError(null)
    setBuySuccess(null)

    try {
      const quantity = parseFloat(buyQuantity)
      if (!quantity || quantity <= 0) {
        setBuyError('Please enter a valid quantity')
        setBuying(false)
        return
      }

      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (!session) {
        setBuyError('Please log in to purchase stocks')
        setBuying(false)
        return
      }

      const response = await fetch('/api/stocks/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setBuyError(data.error || 'Failed to purchase stock')
      } else {
        setBuySuccess(data.message)
        setBuyQuantity('1')
        // Reload position data
        const { data: { session: reloadSession } } = await supabaseClient.auth.getSession()
        if (reloadSession) {
          const positionsResponse = await fetch('/api/positions', {
            headers: {
              'Authorization': `Bearer ${reloadSession.access_token}`,
            },
          })
          const positionsData = await positionsResponse.json()
          if (positionsResponse.ok && positionsData.positions) {
            const userPosition = positionsData.positions.find((p: Position) => p.symbol === symbol.toUpperCase())
            if (userPosition) {
              setPosition(userPosition)
            }
          }
        }
        // Reload quote to get updated price
        const quoteResponse = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const quoteData = await quoteResponse.json()
        if (quoteResponse.ok && quoteData.quote) {
          setQuote(quoteData.quote)
        }
      }
    } catch (err) {
      setBuyError('An unexpected error occurred. Please try again.')
      console.error('Buy stock error:', err)
    } finally {
      setBuying(false)
    }
  }

  const handleSellStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setSelling(true)
    setSellError(null)
    setSellSuccess(null)

    try {
      const quantity = parseFloat(sellQuantity)
      if (!quantity || quantity <= 0) {
        setSellError('Please enter a valid quantity')
        setSelling(false)
        return
      }

      if (position && quantity > position.quantity) {
        setSellError(`You only own ${position.quantity.toFixed(4)} shares`)
        setSelling(false)
        return
      }

      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (!session) {
        setSellError('Please log in to sell stocks')
        setSelling(false)
        return
      }

      const response = await fetch('/api/stocks/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: quantity,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSellError(data.error || 'Failed to sell stock')
      } else {
        setSellSuccess(data.message)
        // Reload position data
        const { data: { session: reloadSession } } = await supabaseClient.auth.getSession()
        if (reloadSession) {
          const positionsResponse = await fetch('/api/positions', {
            headers: {
              'Authorization': `Bearer ${reloadSession.access_token}`,
            },
          })
          const positionsData = await positionsResponse.json()
          if (positionsResponse.ok && positionsData.positions) {
            const userPosition = positionsData.positions.find((p: Position) => p.symbol === symbol.toUpperCase())
            if (userPosition) {
              setPosition(userPosition)
              setSellQuantity(userPosition.quantity.toString())
            } else {
              // Position was fully sold
              setPosition(null)
              setSellQuantity('')
            }
          }
        }
        // Reload quote to get updated price
        const quoteResponse = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const quoteData = await quoteResponse.json()
        if (quoteResponse.ok && quoteData.quote) {
          setQuote(quoteData.quote)
        }
      }
    } catch (err) {
      setSellError('An unexpected error occurred. Please try again.')
      console.error('Sell stock error:', err)
    } finally {
      setSelling(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading position information...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Position Not Found</h1>
            <p className="text-gray-600">Symbol: <span className="font-mono font-semibold">{symbol?.toUpperCase()}</span></p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p className="font-semibold mb-1">Error:</p>
            <p>{error}</p>
          </div>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (!quote) {
    return null
  }

  const changeValue = parseFloat(quote.change)
  const isPositive = changeValue >= 0

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-block text-blue-600 hover:text-blue-500 mb-6"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Stock Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{quote.symbol}</h1>
            <div className="flex items-baseline gap-4">
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(quote.price)}
              </p>
              <p
                className={`text-xl font-semibold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {formatCurrency(quote.change)} ({quote.changePercent})
              </p>
            </div>
          </div>

          {/* Position Info */}
          {position && (
            <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Position</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Quantity Owned</p>
                  <p className="text-2xl font-bold text-gray-900">{position.quantity.toFixed(4)} shares</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Price</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(position.averagePrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(position.totalCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(position.totalValue)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Profit/Loss</p>
                  <p className={`text-2xl font-bold ${position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {position.profitLoss >= 0 ? '+' : ''}{formatCurrency(position.profitLoss)} ({position.profitLossPercent >= 0 ? '+' : ''}{position.profitLossPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Open</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(quote.open)}
              </p>
            </div>

            <div className="border-b md:border-b-0 border-gray-200 pb-4 md:pb-0">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Previous Close</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(quote.previousClose)}
              </p>
            </div>

            <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-6 pt-4 md:pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">High</h3>
              <p className="text-2xl font-semibold text-green-600">
                {formatCurrency(quote.high)}
              </p>
            </div>

            <div className="border-b md:border-b-0 border-gray-200 pb-4 md:pb-0 pt-4 md:pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Low</h3>
              <p className="text-2xl font-semibold text-red-600">
                {formatCurrency(quote.low)}
              </p>
            </div>

            <div className="border-b md:border-b-0 md:border-r border-gray-200 pb-4 md:pb-0 md:pr-6 pt-4 md:pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Volume</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(quote.volume)}
              </p>
            </div>

            <div className="pt-4 md:pt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Latest Trading Day</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {quote.latestTradingDay}
              </p>
            </div>
          </div>

          {/* Trading Actions */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Actions</h2>
            
            {/* Buy Section */}
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Buy Stock</h3>
              
              {buySuccess && (
                <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-md">
                  <p className="font-semibold">{buySuccess}</p>
                </div>
              )}

              {buyError && (
                <div className="mb-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-md">
                  <p className="font-semibold">{buyError}</p>
                </div>
              )}

              <form onSubmit={handleBuyStock} className="space-y-4">
                <div>
                  <label htmlFor="buyQuantity" className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity (Number of Shares)
                  </label>
                  <div className="flex gap-4 items-end">
                    <input
                      type="number"
                      id="buyQuantity"
                      min="0.01"
                      step="0.01"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter quantity"
                      required
                      disabled={buying}
                    />
                    {quote && (
                      <div className="text-sm text-gray-600">
                        <p>Total: {formatCurrency((parseFloat(quote.price) * parseFloat(buyQuantity || '0')).toString())}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={buying || !quote}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {buying ? 'Processing...' : `Buy ${quote?.symbol || 'Stock'}`}
                </button>
                <p className="text-sm text-gray-500">
                  Stock will be purchased at the current market price: {quote ? formatCurrency(quote.price) : 'N/A'}
                </p>
              </form>
            </div>

            {/* Sell Section */}
            {position && position.quantity > 0 && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sell Stock</h3>
                
                {sellSuccess && (
                  <div className="mb-4 bg-green-100 border border-green-300 text-green-800 px-4 py-3 rounded-md">
                    <p className="font-semibold">{sellSuccess}</p>
                  </div>
                )}

                {sellError && (
                  <div className="mb-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-md">
                    <p className="font-semibold">{sellError}</p>
                  </div>
                )}

                <form onSubmit={handleSellStock} className="space-y-4">
                  <div>
                    <label htmlFor="sellQuantity" className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity (Number of Shares to Sell)
                    </label>
                    <div className="flex gap-4 items-end">
                      <input
                        type="number"
                        id="sellQuantity"
                        min="0.0001"
                        step="0.0001"
                        max={position.quantity}
                        value={sellQuantity}
                        onChange={(e) => setSellQuantity(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Enter quantity"
                        required
                        disabled={selling}
                      />
                      <button
                        type="button"
                        onClick={() => setSellQuantity(position.quantity.toString())}
                        className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        disabled={selling}
                      >
                        Max
                      </button>
                      {quote && (
                        <div className="text-sm text-gray-600">
                          <p>Total: {formatCurrency((parseFloat(quote.price) * parseFloat(sellQuantity || '0')).toString())}</p>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum: {position.quantity.toFixed(4)} shares
                    </p>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={selling || !quote}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {selling ? 'Processing...' : `Sell ${quote?.symbol || 'Stock'}`}
                  </button>
                  <p className="text-sm text-gray-500 text-center">
                    Stock will be sold at the current market price: {quote ? formatCurrency(quote.price) : 'N/A'}
                  </p>
                </form>
              </div>
            )}

            {(!position || position.quantity === 0) && (
              <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                <p>You don&apos;t own any shares of this stock to sell.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
