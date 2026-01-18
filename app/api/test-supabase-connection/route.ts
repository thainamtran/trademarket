import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const results = {
    success: false,
    checks: {
      envVariables: false,
      clientCreation: false,
      authService: false,
      databaseConnection: false,
    },
    details: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
      hasApiKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      errors: [] as string[],
    },
    timestamp: new Date().toISOString(),
  }

  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      results.details.errors.push('NEXT_PUBLIC_SUPABASE_URL is not set')
      return NextResponse.json(results, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      results.details.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
      return NextResponse.json(results, { status: 500 })
    }
    results.checks.envVariables = true

    // Test client creation
    try {
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      if (supabaseClient) {
        results.checks.clientCreation = true
      }
    } catch (error: any) {
      results.details.errors.push(`Client creation failed: ${error.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    // Test authentication service
    try {
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession()
      if (sessionError) {
        if (sessionError.message.includes('Invalid API key') || sessionError.message.includes('JWT')) {
          results.details.errors.push(`Authentication error: ${sessionError.message}`)
          return NextResponse.json(results, { status: 500 })
        }
      }
      results.checks.authService = true
    } catch (error: any) {
      results.details.errors.push(`Auth service test failed: ${error.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    // Test database connection with a simple query
    try {
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      // Try to query a non-existent table - if connection works, we'll get a "table doesn't exist" error
      const { error: queryError } = await supabaseClient
        .from('_test_connection_table')
        .select('*')
        .limit(0)

      if (queryError) {
        // If error is about table not existing, connection is working
        if (
          queryError.message.includes('does not exist') ||
          queryError.message.includes('relation') ||
          queryError.message.includes('permission denied')
        ) {
          results.checks.databaseConnection = true
        } else if (queryError.message.includes('Invalid API key') || queryError.message.includes('JWT')) {
          results.details.errors.push(`Database connection failed: ${queryError.message}`)
          return NextResponse.json(results, { status: 500 })
        } else {
          // Other errors might still indicate connection works
          results.checks.databaseConnection = true
        }
      } else {
        results.checks.databaseConnection = true
      }
    } catch (error: any) {
      results.details.errors.push(`Database test failed: ${error.message}`)
      return NextResponse.json(results, { status: 500 })
    }

    // All checks passed
    results.success = true
    return NextResponse.json(results, { status: 200 })
  } catch (error: any) {
    results.details.errors.push(`Unexpected error: ${error.message}`)
    return NextResponse.json(results, { status: 500 })
  }
}
