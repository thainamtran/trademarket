'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  initial_balance: number
  current_balance: number
  total_value: number
}

interface Stock {
  symbol: string
  name: string
  type: string
  region: string
  currency: string
  matchScore: string
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
  purchaseDates: string[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [positions, setPositions] = useState<Position[]>([])
  const [loadingPositions, setLoadingPositions] = useState(true)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabaseClient.auth.getSession()

        if (!session) {
          router.push('/login')
          return
        }

        // Load user profile
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id, full_name, email, initial_balance, current_balance, total_value')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          setError('Failed to load profile. Please try again.')
          console.error('Profile load error:', profileError)
        } else {
          setProfile(profileData)
        }
      } catch (err) {
        setError('An unexpected error occurred.')
        console.error('Dashboard error:', err)
      } finally {
        setLoading(false)
      }
    }

    const loadPositions = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (!session) return

        const response = await fetch('/api/positions', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        const data = await response.json()
        if (response.ok && data.positions) {
          setPositions(data.positions)
        }
      } catch (err) {
        console.error('Failed to load positions:', err)
      } finally {
        setLoadingPositions(false)
      }
    }

    loadProfile()
    loadPositions()
  }, [router])

  const handleSearch = async (query: string) => {
    if (!query || query.trim().length < 1) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.error) {
        console.error('Search error:', data.error)
        setSearchResults([])
      } else {
        setSearchResults(data.stocks || [])
        setShowResults(true)
      }
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    handleSearch(value)
  }

  const handleStockSelect = (symbol: string) => {
    router.push(`/dashboard/stock/${symbol}`)
    setShowResults(false)
    setSearchQuery('')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:text-blue-500"
          >
            Return to home
          </Link>
        </div>
      </main>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by stock name or symbol (e.g., AAPL, Apple, Microsoft)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            {isSearching && (
              <div className="absolute right-4 top-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <div className="mt-4 bg-white rounded-lg shadow-md border border-gray-200 max-h-96 overflow-y-auto">
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleStockSelect(stock.symbol)}
                  className="w-full px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{stock.symbol}</p>
                      <p className="text-sm text-gray-600">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{stock.type}</p>
                      <p className="text-xs text-gray-500">{stock.currency}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showResults && searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="mt-4 bg-white rounded-lg shadow-md border border-gray-200 p-4 text-center text-gray-500">
              No stocks found. Try a different search term.
            </div>
          )}
        </div>

        {/* Positions Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">My Positions</h2>
          
          {loadingPositions ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading positions...</p>
            </div>
          ) : positions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <p>You don&apos;t have any positions yet.</p>
              <p className="text-sm mt-2">Search for stocks above to start building your portfolio.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions.map((position) => {
                      return (
                        <tr 
                          key={position.symbol} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/dashboard/position/${position.symbol}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-blue-600 hover:text-blue-800 font-semibold">
                              {position.symbol}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {position.quantity.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${position.currentPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Link
                                href={`/dashboard/stock/${position.symbol}`}
                                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs font-medium"
                              >
                                Buy
                              </Link>
                              <Link
                                href={`/dashboard/sell/${position.symbol}`}
                                className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs font-medium"
                              >
                                Sell
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
