/**
 * Supabase server client (@supabase/ssr) — use this in Server Components, Server
 * Actions, Route Handlers, and any server-only code. Do not import this file from
 * Client Components.
 *
 * Auth / RBAC strategy (Phase 0+):
 * - Roles live in Postgres (`profiles.role`), not in JWT custom claims.
 * - On each authenticated server request, derive authorization by loading the
 *   session with `createClient()` then joining `profiles` (or using RLS-safe
 *   queries) as needed.
 * - For edge-style route guards, Next.js 16 renames Middleware to Proxy
 *   (`proxy.ts`); use the SSR client there with the request/response cookie
 *   adapters from Supabase docs. After validating the session, read `role` from
 *   `profiles` and pass it downstream (e.g. short-lived `Set-Cookie` on the
 *   response, or a request header on `NextResponse.next({ request: { headers } })`)
 *   so Server Components can read it without repeating the profile query when
 *   appropriate. Treat cookie/header role as a hint only — always re-check with
 *   Supabase + RLS for mutations and sensitive reads.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component without mutable response — session
            // refresh is handled in Proxy / Route Handlers when applicable.
          }
        },
      },
    }
  )
}
