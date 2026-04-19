/**
 * Purge every auth user EXCEPT:
 *   - the shadow roster (app_metadata.shadow === true)
 *   - the protected admin email(s) listed below
 *
 * Use this once, after `npm run training:seed-shadow`, to clear out
 * any dev/test accounts you created by hand earlier so the only
 * people who can log in are the 13 shadow accounts + you.
 *
 * Dry-run by default. Nothing is deleted unless you pass --confirm:
 *
 *   npm run training:purge-non-shadow              # preview only
 *   npm run training:purge-non-shadow -- --confirm # actually delete
 *
 * Deleting an auth user cascades through:
 *   profiles → fto_pairings → dit_records → weekly_training_sessions
 *           → weekly_competency_scores → training_activity_exposures
 *           → case_assignments → call_out_logs → pto_pbles
 *           → pto_pble_artifacts → completion_certificates
 *           → equipment_checkoffs → fto_feedback_surveys
 *           → document_signatures / signature_events
 *           → training_documents / dit_journal_entries / etc.
 * (all via ON DELETE CASCADE on auth.users).
 */

import * as path from 'node:path'

import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

// ---------------------------------------------------------------------------
// SAFE-LIST: these emails are NEVER deleted by this script. Edit here if
// another admin needs protecting in the future.
// ---------------------------------------------------------------------------
const PROTECTED_EMAILS = new Set<string>([
  'bstanley@rcsotn.org',
])

const CONFIRM = process.argv.includes('--confirm')

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

type Classified = {
  id: string
  email: string
  created_at: string
  decision: 'keep-shadow' | 'keep-protected' | 'delete'
  reason: string
}

async function listAll(client: SupabaseClient): Promise<Classified[]> {
  const rows: Classified[] = []
  let page = 1
  const perPage = 200
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const users = data.users ?? []
    for (const u of users) {
      const email = (u.email ?? '').trim().toLowerCase()
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>
      const isShadow = meta.shadow === true
      const isProtected = PROTECTED_EMAILS.has(email)
      let decision: Classified['decision']
      let reason: string
      if (isShadow) {
        decision = 'keep-shadow'
        reason = `shadow_key=${String(meta.shadow_key ?? '?')}`
      } else if (isProtected) {
        decision = 'keep-protected'
        reason = 'protected email'
      } else {
        decision = 'delete'
        reason = 'not shadow, not protected'
      }
      rows.push({
        id: u.id,
        email: u.email ?? '(no email)',
        created_at: u.created_at ?? '',
        decision,
        reason,
      })
    }
    if (users.length < perPage) break
    page += 1
    if (page > 50) break
  }
  return rows
}

function summarize(rows: Classified[]) {
  const groups: Record<Classified['decision'], Classified[]> = {
    'keep-shadow': [],
    'keep-protected': [],
    delete: [],
  }
  for (const r of rows) groups[r.decision].push(r)

  console.info(
    `\n[purge] Found ${rows.length} auth user(s):\n` +
      `   keep-shadow    = ${groups['keep-shadow'].length}\n` +
      `   keep-protected = ${groups['keep-protected'].length}\n` +
      `   delete         = ${groups.delete.length}\n`,
  )

  const printGroup = (label: string, list: Classified[]) => {
    if (list.length === 0) return
    console.info(`  --- ${label} ---`)
    for (const r of list) {
      console.info(
        `    ${r.email.padEnd(42)}  ${r.id}  (${r.reason})`,
      )
    }
    console.info('')
  }
  printGroup('KEEP (shadow)', groups['keep-shadow'])
  printGroup('KEEP (protected)', groups['keep-protected'])
  printGroup('WILL DELETE', groups.delete)
  return groups
}

async function main() {
  const client = supa()

  console.info('[purge] scanning auth users…')
  const rows = await listAll(client)
  const groups = summarize(rows)

  if (!CONFIRM) {
    console.info(
      '[purge] DRY RUN. Nothing was deleted.\n' +
        '[purge] Re-run with --confirm to actually delete the accounts listed under WILL DELETE:\n' +
        '   npm run training:purge-non-shadow -- --confirm\n',
    )
    return
  }

  if (groups.delete.length === 0) {
    console.info('[purge] Nothing to delete. Done.')
    return
  }

  // Extra safety: never delete EVERY user in the project.
  if (groups['keep-shadow'].length === 0 && groups['keep-protected'].length === 0) {
    throw new Error(
      '[purge] Refusing to run — the safelist matched zero users. Did you run ' +
        'training:seed-shadow first, or is PROTECTED_EMAILS wrong in this script?',
    )
  }

  console.info(`[purge] deleting ${groups.delete.length} user(s)…`)
  let ok = 0
  let failed = 0
  for (const r of groups.delete) {
    const { error } = await client.auth.admin.deleteUser(r.id)
    if (error) {
      failed += 1
      console.warn(`  × failed ${r.email} (${r.id}): ${error.message}`)
    } else {
      ok += 1
      console.info(`  · deleted ${r.email} (${r.id})`)
    }
  }
  console.info(`[purge] DONE — deleted ${ok}, failed ${failed}`)
}

main().catch((err) => {
  console.error('\n[purge] FAILED:', err)
  process.exit(1)
})
