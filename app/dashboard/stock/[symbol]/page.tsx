'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import StockChart from '@/components/StockChart'

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

export default function StockDetailPage() {
  const router = useRouter()
  const params = useParams()
  const symbol = params.symbol as string
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buyQuantity, setBuyQuantity] = useState<string>('1')
  const [buying, setBuying] = useState(false)
  const [buySuccess, setBuySuccess] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndLoadQuote = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabaseClient.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // Load stock quote
        const response = await fetch(`/api/stocks/quote?symbol=${encodeURIComponent(symbol)}`)
        const data = await response.json()

        if (!response.ok || data.error) {
          const errorMessage = data.error || 'Failed to load stock information'
          console.error('Stock quote API error:', { status: response.status, error: errorMessage })
          setError(errorMessage)
        } else if (data.quote) {
          setQuote(data.quote)
        } else {
          setError('No stock data received from server')
        }
      } catch (err) {
        setError('Failed to load stock information. Please try again.')
        console.error('Stock quote error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      checkAuthAndLoadQuote()
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

      // Get the session token from Supabase client
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
        // Navigate to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err) {
      setBuyError('An unexpected error occurred. Please try again.')
      console.error('Buy stock error:', err)
    } finally {
      setBuying(false)
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Stock Not Found</h1>
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
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                window.location.reload()
              }}
              className="block w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
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
    <main className="min-h-screen bg-gray-50 px-2 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-block text-blue-600 hover:text-blue-500 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 md:p-4">
          {/* Stock Header */}
          <div className="mb-2 sm:mb-3">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">{quote.symbol}</h1>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                {formatCurrency(quote.price)}
              </p>
              <p
                className={`text-sm sm:text-base md:text-lg font-semibold ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {formatCurrency(quote.change)} ({quote.changePercent})
              </p>
            </div>
          </div>

          {/* Price Chart */}
          <div className="mb-3 sm:mb-4">
            <StockChart symbol={quote.symbol} height={200} />
          </div>

          {/* Stock Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
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
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-2">Trading Actions</h2>
            
            {buySuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                <p className="font-semibold">{buySuccess}</p>
                <p className="text-sm mt-1">Redirecting to dashboard...</p>
              </div>
            )}

            {buyError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p className="font-semibold">{buyError}</p>
              </div>
            )}

            <form onSubmit={handleBuyStock} className="space-y-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (Number of Shares)
                </label>
                <div className="flex gap-4 items-end">
                  <input
                    type="number"
                    id="quantity"
                    min="0.01"
                    step="0.01"
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(e.target.value)}
                    className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      </div>
    </main>
  )
}
