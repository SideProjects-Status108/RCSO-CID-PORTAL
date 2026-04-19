/**
 * Wipe every NON-shadow training account.
 *
 * Keeps:
 *   - any auth user with app_metadata.shadow === true  (the 13 seeded people)
 *   - the admin account(s) whose email is in KEEP_EMAILS
 *   - anything in KEEP_USER_IDS (belt + suspenders)
 *
 * Deletes everyone else. Deleting the auth user cascades through
 * profiles → dit_records → fto_pairings → weekly sessions / scores /
 * exposures / cases / call-outs / PBLEs / certificates via ON DELETE
 * CASCADE, so one delete tears the whole training footprint down for
 * that user.
 *
 * Safety:
 *   - DRY RUN by default. Prints what WOULD be deleted and exits.
 *   - Pass --apply to actually delete. Also requires typing the
 *     confirmation string below at the prompt when --apply is passed.
 *
 * Usage:
 *   npm run training:cleanup-non-shadow           # dry run
 *   npm run training:cleanup-non-shadow -- --apply  # real delete
 */

import * as path from 'node:path'
import * as readline from 'node:readline/promises'

import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

// -------------------------------------------------------------------------
// Configure: who to KEEP.
// -------------------------------------------------------------------------

const KEEP_EMAILS = new Set<string>(
  [
    'bstanley@rcsotn.org',
  ].map((e) => e.trim().toLowerCase()),
)

const KEEP_USER_IDS = new Set<string>([
  // Add any UUIDs you want to preserve even if email doesn't match.
])

const CONFIRMATION_PHRASE = 'DELETE NON-SHADOW'

// -------------------------------------------------------------------------

function supa(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local',
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type AuthUserLite = {
  id: string
  email: string
  shadow: boolean
  shadow_key: string | null
}

async function listAllUsers(client: SupabaseClient): Promise<AuthUserLite[]> {
  const out: AuthUserLite[] = []
  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const users = data.users ?? []
    for (const u of users) {
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>
      out.push({
        id: u.id,
        email: (u.email ?? '').toLowerCase(),
        shadow: meta.shadow === true,
        shadow_key: typeof meta.shadow_key === 'string' ? meta.shadow_key : null,
      })
    }
    if (users.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return out
}

async function profileFor(
  client: SupabaseClient,
  userId: string,
): Promise<{ full_name: string; role: string } | null> {
  const { data } = await client
    .from('profiles')
    .select('full_name, role')
    .eq('id', userId)
    .maybeSingle()
  if (!data) return null
  return {
    full_name: String((data as { full_name: string }).full_name ?? ''),
    role: String((data as { role: string }).role ?? ''),
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const client = supa()

  console.info('[cleanup] scanning auth users…')
  const users = await listAllUsers(client)

  const keep: AuthUserLite[] = []
  const toDelete: Array<AuthUserLite & { profile?: { full_name: string; role: string } | null }> =
    []

  for (const u of users) {
    if (u.shadow) {
      keep.push(u)
      continue
    }
    if (KEEP_EMAILS.has(u.email)) {
      keep.push(u)
      continue
    }
    if (KEEP_USER_IDS.has(u.id)) {
      keep.push(u)
      continue
    }
    const profile = await profileFor(client, u.id)
    toDelete.push({ ...u, profile })
  }

  console.info(`\n[cleanup] keeping ${keep.length} user(s):`)
  for (const u of keep) {
    const why = u.shadow ? `shadow:${u.shadow_key ?? '?'}` : 'safelisted'
    console.info(`  · KEEP  ${u.email.padEnd(40)}  ${why}`)
  }

  console.info(`\n[cleanup] would delete ${toDelete.length} user(s):`)
  for (const u of toDelete) {
    const name = u.profile?.full_name || '(no profile)'
    const role = u.profile?.role || '-'
    console.info(`  · DEL   ${u.email.padEnd(40)}  ${role.padEnd(18)} ${name}`)
  }

  if (!apply) {
    console.info(
      '\n[cleanup] DRY RUN — no changes made. Re-run with --apply to actually delete.',
    )
    return
  }

  if (toDelete.length === 0) {
    console.info('\n[cleanup] nothing to delete.')
    return
  }

  // Interactive confirmation — service-role is a loaded gun. Require an
  // exact phrase so a muscle-memory --apply can't wipe real rows.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const answer = (
    await rl.question(
      `\nType '${CONFIRMATION_PHRASE}' to delete ${toDelete.length} user(s): `,
    )
  ).trim()
  rl.close()
  if (answer !== CONFIRMATION_PHRASE) {
    console.info('[cleanup] confirmation phrase not matched. Aborting.')
    return
  }

  console.info('\n[cleanup] deleting…')
  let deleted = 0
  for (const u of toDelete) {
    const { error } = await client.auth.admin.deleteUser(u.id)
    if (error) {
      console.warn(`  · FAILED ${u.email}: ${error.message}`)
      continue
    }
    deleted += 1
    console.info(`  · deleted ${u.email}`)
  }
  console.info(`\n[cleanup] removed ${deleted} of ${toDelete.length} user(s). DONE`)
}

main().catch((err) => {
  console.error('\n[cleanup] FAILED:', err)
  process.exit(1)
})
