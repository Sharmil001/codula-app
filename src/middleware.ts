import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATIC_PATHS = ['/_next/', '/api/', '/favicon.ico']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files
  if (STATIC_PATHS.some(path => pathname.startsWith(path)) || pathname.includes('.')) {
    return NextResponse.next()
  }

  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req: request, res })
    const { data: { user } } = await supabase.auth.getUser()

    // If no user, let the pages handle auth
    if (!user) return res

    // Simple check: only redirect if explicitly marked as complete
    const { data: onboardingData } = await supabase
      .from('user_onboarding')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    const isComplete = onboardingData?.onboarding_completed === true

    console.log('🔍 Middleware simple check:', {
      pathname,
      isComplete,
      onboarding_completed: onboardingData?.onboarding_completed
    })

    // Only do redirects based on the explicit completion flag
    if (pathname === '/' && isComplete === false) {
      console.log('🔄 Home → Onboarding (not complete)')
      return NextResponse.redirect(new URL('/onboarding?step=1', request.url))
    }

    if (pathname.startsWith('/onboarding') && isComplete === true) {
      console.log('🔄 Onboarding → Home (complete)')
      return NextResponse.redirect(new URL('/', request.url))
    }

    return res
  } catch (error) {
    console.error('❌ Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}