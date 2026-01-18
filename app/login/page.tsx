'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      // Test Supabase connection first
      console.log('Testing Supabase connection...')
      try {
        const { data: testSession } = await supabaseClient.auth.getSession()
        console.log('Supabase connection test passed')
      } catch (connError) {
        console.error('Supabase connection test failed:', connError)
        setError('Cannot connect to database. Please check your connection and try again.')
        setLoading(false)
        return
      }

      // Step 1: Authenticate user with Supabase Auth
      const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Authentication failed. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Verify user profile exists in profiles table (non-blocking)
      try {
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        if (profileError) {
          // If profile doesn't exist, create one
          if (profileError.code === 'PGRST116' || profileError.message.includes('No rows') || profileError.message.includes('does not exist')) {
            console.log('Profile not found, creating new profile...')
            
            const { error: createProfileError } = await supabaseClient
              .from('profiles')
              .insert({
                id: authData.user.id,
                full_name: authData.user.user_metadata?.full_name || '',
                email: authData.user.email || email,
                initial_balance: 100000.00,
                current_balance: 100000.00,
                total_value: 100000.00,
              })

            if (createProfileError) {
              // Log error but don't block login - profile might already exist or be created by trigger
              console.warn('Profile creation warning:', createProfileError)
              // Check if it's a duplicate key error (profile already exists)
              if (!createProfileError.code || createProfileError.code !== '23505') {
                console.error('Non-duplicate profile creation error:', createProfileError)
              }
            }
          } else {
            // Log other database errors but don't block login
            console.warn('Profile fetch warning:', profileError)
          }
        }
      } catch (profileCheckErr) {
        // Don't block login if profile check fails
        console.warn('Profile check error (non-blocking):', profileCheckErr)
      }

      // Step 3: Login successful, log and redirect to dashboard
      console.log('User login successful:', {
        userId: authData.user.id,
        email: authData.user.email,
        timestamp: new Date().toISOString(),
      })
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Login error:', err)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Sign in to TradeMarket</h2>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
              return to home
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={loading}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:bg-gray-100"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
