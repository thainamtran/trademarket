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

export default function StockDetailPage() {
  const router = useRouter()
  const params = useParams()
  const symbol = params.symbol as string
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<StockQuote | null>(null)
  const [error, setError] = useState<string | null>(null)

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

        if (data.error) {
          setError(data.error)
        } else {
          setQuote(data.quote)
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
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
          <Link
            href="/dashboard"
            className="inline-block text-blue-600 hover:text-blue-500"
          >
            ← Back to Dashboard
          </Link>
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

          {/* Stock Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          {/* Trading Actions Placeholder */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Actions</h2>
            <div className="flex gap-4">
              <button
                disabled
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Buy Stock
              </button>
              <button
                disabled
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Sell Stock
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Trading functionality will be available soon
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
