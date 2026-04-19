/**
 * Surgically remove every shadow-environment account.
 *
 * Only touches auth users that were created with app_metadata.shadow === true
 * (and match one of the known shadow_keys from roster.ts). Deleting the auth
 * user cascades through profiles → fto_pairings → dit_records → weekly
 * sessions / scores / exposures / cases / call-outs / PBLEs / certificates
 * via ON DELETE CASCADE, so a single delete per user tears the whole shadow
 * environment down cleanly.
 *
 * MailSlurp inboxes are ALSO deleted (each one was named rcso-shadow:<key>).
 *
 * Usage:
 *   npm run training:reset-shadow
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { config as loadEnv } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { deleteInbox, listInboxes } from '../../src/lib/email/mailslurp'
import { SHADOW_ROSTER } from './roster'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

const ROSTER_OUTPUT = path.resolve(process.cwd(), '.shadow-roster.local.json')
const SHADOW_KEYS = new Set(SHADOW_ROSTER.map((p) => p.key))

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

async function main() {
  const client = supa()

  console.info('[reset-shadow] scanning auth users for shadow accounts…')
  let deleted = 0
  let page = 1
  const perPage = 200
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const users = data.users ?? []
    for (const u of users) {
      const meta = (u.app_metadata ?? {}) as Record<string, unknown>
      if (meta.shadow !== true) continue
      const key = typeof meta.shadow_key === 'string' ? meta.shadow_key : null
      if (!key || !SHADOW_KEYS.has(key)) continue
      const { error: delErr } = await client.auth.admin.deleteUser(u.id)
      if (delErr) {
        console.warn(`  · failed to delete ${u.email} (${key}): ${delErr.message}`)
        continue
      }
      deleted += 1
      console.info(`  · deleted ${u.email} (${key})`)
    }
    if (users.length < perPage) break
    page += 1
    if (page > 50) break // safety net
  }
  console.info(`[reset-shadow] removed ${deleted} auth user(s).`)

  console.info('\n[reset-shadow] removing MailSlurp inboxes with name rcso-shadow:*…')
  try {
    const inboxes = await listInboxes()
    let removedInboxes = 0
    for (const ib of inboxes) {
      const name = (ib.name ?? '').trim()
      if (!name.startsWith('rcso-shadow:')) continue
      try {
        await deleteInbox(ib.id)
        removedInboxes += 1
        console.info(`  · deleted inbox ${name} (${ib.emailAddress})`)
      } catch (err) {
        console.warn(`  · failed to delete inbox ${name}:`, err)
      }
    }
    console.info(`[reset-shadow] removed ${removedInboxes} MailSlurp inbox(es).`)
  } catch (err) {
    console.warn('[reset-shadow] skipping MailSlurp cleanup:', err)
  }

  if (fs.existsSync(ROSTER_OUTPUT)) {
    fs.unlinkSync(ROSTER_OUTPUT)
    console.info(`[reset-shadow] removed ${ROSTER_OUTPUT}`)
  }

  console.info('[reset-shadow] DONE')
}

main().catch((err) => {
  console.error('\n[reset-shadow] FAILED:', err)
  process.exit(1)
})
