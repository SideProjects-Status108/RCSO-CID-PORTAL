import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isUserRole } from '@/lib/auth/roles'

const BOOTSTRAP_SIGNUP = process.env.ALLOW_BOOTSTRAP_SIGNUP === 'true'

function supabaseEnvConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

function mergeCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, cookie)
  })
}

function isPublicPath(pathname: string) {
  if (pathname === '/login' || pathname.startsWith('/login/')) return true
  if (pathname === '/unauthorized' || pathname.startsWith('/unauthorized/'))
    return true
  if (pathname.startsWith('/auth/')) return true
  if (pathname === '/signup' || pathname.startsWith('/signup/')) {
    return BOOTSTRAP_SIGNUP
  }
  return false
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (!supabaseEnvConfigured()) {
    if (pathname === '/login' || pathname.startsWith('/login/')) {
      return NextResponse.next()
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'missing_supabase_env')
    return NextResponse.redirect(url)
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    url.search = ''
    const redirectResponse = NextResponse.redirect(url)
    mergeCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  if ((pathname === '/signup' || pathname.startsWith('/signup/')) && !BOOTSTRAP_SIGNUP) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('reason', 'signup_disabled')
    const redirectResponse = NextResponse.redirect(url)
    mergeCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    const redirectResponse = NextResponse.redirect(url)
    mergeCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const redirectResponse = NextResponse.redirect(
      new URL('/dashboard', request.url)
    )
    mergeCookies(supabaseResponse, redirectResponse)
    return redirectResponse
  }

  if (user) {
    const rcsoRoleCookie = request.cookies.get('rcso-role')?.value ?? null
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const dbRole = profile?.role
    if (dbRole && isUserRole(dbRole)) {
      const rcsoRoleOutOfSync =
        rcsoRoleCookie == null ||
        !isUserRole(rcsoRoleCookie) ||
        rcsoRoleCookie !== dbRole
      if (rcsoRoleOutOfSync && process.env.NODE_ENV === 'development') {
        console.debug('[proxy] rcso-role out of sync with profiles.role; rewriting cookie')
      }
      // profiles.role wins: Set-Cookie always uses DB (fixes staleness + slides maxAge).
      supabaseResponse.cookies.set('rcso-role', dbRole, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      })
    } else {
      supabaseResponse.cookies.delete('rcso-role')
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Skip Next internals, `public/data/*` (GeoJSON etc.), and common static extensions
    // so those requests are not rewritten by auth (avoids 307/404 on map zone loads).
    '/((?!_next/|_vercel|favicon.ico|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|geojson|json|txt|woff2?)$).*)',
  ],
}
