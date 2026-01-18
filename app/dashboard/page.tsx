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

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

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

    loadProfile()
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Search Stocks</h1>
          
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
      </div>
    </main>
  )
}
