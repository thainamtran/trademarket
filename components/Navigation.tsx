'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase/client'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('[Navigation] Starting checkAuth...')
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
        
        if (sessionError) {
          console.error('[Navigation] Session error:', sessionError)
          setIsAuthenticated(false)
          setLoading(false)
          return
        }

        console.log('[Navigation] Session check:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email 
        })
        
        const isAuth = !!session
        setIsAuthenticated(isAuth)
      } catch (err: any) {
        console.error('[Navigation] checkAuth exception:', err)
        console.error('[Navigation] Exception details:', {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        })
        setIsAuthenticated(false)
      } finally {
        console.log('[Navigation] checkAuth completed, setting loading to false')
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Navigation] Auth state changed:', { event, hasSession: !!session, userId: session?.user?.id })
        const isAuth = !!session
        setIsAuthenticated(isAuth)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut()
    setIsOpen(false)
    router.push('/')
    router.refresh()
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  return (
    <nav className="fixed top-0 left-0 z-50 w-full">
      <div className="bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={toggleMenu}
            className="flex flex-col gap-1.5 p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            <span
              className={`block h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
                isOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
                isOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-6 bg-gray-800 transition-all duration-300 ${
                isOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>
        </div>

        {/* Menu Dropdown */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-4 space-y-2">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Home
            </Link>
            
            {!loading && (
              <>
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
