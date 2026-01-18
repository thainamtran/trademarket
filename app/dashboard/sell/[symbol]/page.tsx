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

interface Holding {
  symbol: string
  totalQuantity: number
}

export default function SellStockPage() {
  const router = useRouter()
  const params = useParams()
  const symbol = params.symbol as string
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [holding, setHolding] = useState<Holding | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sellQuantity, setSellQuantity] = useState<string>('')
  const [selling, setSelling] = useState(false)
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
          setError(errorMessage)
        } else if (quoteData.quote) {
          setQuote(quoteData.quote)
        }

        // Load user's holdings for this symbol
        const { data: { session: holdingsSession } } = await supabaseClient.auth.getSession()
        if (holdingsSession) {
          const positionsResponse = await fetch('/api/positions', {
            headers: {
              'Authorization': `Bearer ${holdingsSession.access_token}`,
            },
          })
          const positionsData = await positionsResponse.json()

          if (positionsResponse.ok && positionsData.positions) {
            const position = positionsData.positions.find((p: any) => p.symbol === symbol.toUpperCase())
            if (position) {
              setHolding({
                symbol: position.symbol,
                totalQuantity: position.quantity,
              })
              setSellQuantity(position.quantity.toString())
            } else {
              setError(`You don't own any shares of ${symbol.toUpperCase()}`)
            }
          }
        }
      } catch (err) {
        setError('Failed to load stock information. Please try again.')
        console.error('Sell page error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      checkAuthAndLoadData()
    }
  }, [symbol, router])

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
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

      if (holding && quantity > holding.totalQuantity) {
        setSellError(`You only own ${holding.totalQuantity.toFixed(4)} shares`)
        setSelling(false)
        return
      }

      // Get the session token from Supabase client
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
        // Refresh and redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
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
          <p className="mt-4 text-gray-600">Loading stock information...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Cannot Sell Stock</h1>
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

  if (!quote || !holding) {
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Sell {quote.symbol}</h1>
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

          {/* Holding Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600">You own</p>
            <p className="text-2xl font-bold text-gray-900">{holding.totalQuantity.toFixed(4)} shares</p>
          </div>

          {/* Sell Form */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sell Stock</h2>
            
            {sellSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                <p className="font-semibold">{sellSuccess}</p>
                <p className="text-sm mt-1">Redirecting to dashboard...</p>
              </div>
            )}

            {sellError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="font-semibold">{sellError}</p>
              </div>
            )}

            <form onSubmit={handleSellStock} className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (Number of Shares to Sell)
                </label>
                <div className="flex gap-4 items-end">
                  <input
                    type="number"
                    id="quantity"
                    min="0.0001"
                    step="0.0001"
                    max={holding.totalQuantity}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter quantity"
                    required
                    disabled={selling}
                  />
                  <button
                    type="button"
                    onClick={() => setSellQuantity(holding.totalQuantity.toString())}
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
                  Maximum: {holding.totalQuantity.toFixed(4)} shares
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
        </div>
      </div>
    </main>
  )
}
