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

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Current Balance Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Current Balance
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(profile.current_balance)}
            </p>
            <p className="text-sm text-gray-500 mt-2">Available cash</p>
          </div>

          {/* Total Portfolio Value Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Total Portfolio Value
            </h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(profile.total_value)}
            </p>
            <p className="text-sm text-gray-500 mt-2">Cash + Holdings</p>
          </div>
        </div>

        {/* Trading Section Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trading Tools</h2>
          <p className="text-gray-600 mb-4">
            Your trading tools and stock market features will be available here.
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-500">Trading features coming soon...</p>
          </div>
        </div>
      </div>
    </main>
  )
}
