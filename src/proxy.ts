import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { isUserRole } from '@/lib/auth/roles'

const BOOTSTRAP_SIGNUP = process.env.ALLOW_BOOTSTRAP_SIGNUP === 'true'

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

  const pathname = request.nextUrl.pathname

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role
    if (role && isUserRole(role)) {
      supabaseResponse.cookies.set('rcso-role', role, {
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
