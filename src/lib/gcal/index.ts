import 'server-only'

import { google } from 'googleapis'

import { createServiceRoleClient } from '@/lib/supabase/admin'
import { decryptToken, encryptToken } from '@/lib/gcal/crypto'
import type { ScheduleEventRow } from '@/types/schedule'

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  if (!clientId || !clientSecret || !redirectUri) return null
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export function buildGoogleCalendarAuthUrl(params: { state: string }) {
  const client = getOAuth2Client()
  if (!client) return null
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: params.state,
  })
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client()
  if (!client) return null
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function getCalendarForUser(userId: string) {
  const admin = createServiceRoleClient()
  if (!admin) return null

  const { data: row, error } = await admin
    .from('user_gcal_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !row) return null

  const access = decryptToken(String(row.access_token_encrypted))
  const refresh = decryptToken(String(row.refresh_token_encrypted))
  if (!access || !refresh) return null

  const client = getOAuth2Client()
  if (!client) return null

  client.setCredentials({
    access_token: access,
    refresh_token: refresh,
    expiry_date: new Date(String(row.token_expiry)).getTime(),
  })

  const exp = client.credentials.expiry_date
  if (exp != null && exp < Date.now() + 120_000) {
    try {
      const { credentials } = await client.refreshAccessToken()
      const newAccess = credentials.access_token
      const newExpiry = credentials.expiry_date
      if (newAccess && newExpiry) {
        const encAccess = encryptToken(newAccess)
        const patch: Record<string, unknown> = {
          access_token_encrypted: encAccess,
          token_expiry: new Date(newExpiry).toISOString(),
        }
        if (credentials.refresh_token) {
          patch.refresh_token_encrypted = encryptToken(credentials.refresh_token)
        }
        await admin.from('user_gcal_tokens').update(patch).eq('user_id', userId)
        client.setCredentials(credentials)
      }
    } catch (e) {
      console.error('[gcal] token refresh failed', e)
    }
  }

  return google.calendar({ version: 'v3', auth: client })
}

function eventBody(ev: ScheduleEventRow) {
  const startIso = ev.start_datetime
  const endIso = ev.end_datetime
  if (ev.is_all_day) {
    const sd = startIso.slice(0, 10)
    const ed = endIso.slice(0, 10)
    return {
      summary: ev.title || 'RCSO schedule',
      description: ev.notes ?? '',
      start: { date: sd },
      end: { date: ed },
    }
  }
  return {
    summary: ev.title || 'RCSO schedule',
    description: ev.notes ?? '',
    start: { dateTime: startIso },
    end: { dateTime: endIso },
  }
}

const SYNC_TYPES = new Set([
  'regular',
  'on_call',
  'vacation',
  'school',
  'in_service',
  'fto_shift',
])

export function shouldSyncScheduleEvent(ev: ScheduleEventRow): boolean {
  return ev.status === 'published' && SYNC_TYPES.has(ev.event_type)
}

export async function createGCalEvent(
  userId: string,
  ev: ScheduleEventRow
): Promise<string | null> {
  if (!shouldSyncScheduleEvent(ev)) return null
  const cal = await getCalendarForUser(userId)
  if (!cal) return null
  try {
    const res = await cal.events.insert({
      calendarId: 'primary',
      requestBody: eventBody(ev),
    })
    return res.data.id ?? null
  } catch (e) {
    console.error('[gcal] create event failed', e)
    return null
  }
}

export async function updateGCalEvent(
  userId: string,
  ev: ScheduleEventRow,
  gcalEventId: string | null
): Promise<string | null> {
  if (!gcalEventId) return createGCalEvent(userId, ev)
  if (!shouldSyncScheduleEvent(ev)) {
    await deleteGCalEvent(userId, gcalEventId)
    return null
  }
  const cal = await getCalendarForUser(userId)
  if (!cal) return null
  try {
    await cal.events.update({
      calendarId: 'primary',
      eventId: gcalEventId,
      requestBody: eventBody(ev),
    })
    return gcalEventId
  } catch (e) {
    console.error('[gcal] update event failed', e)
    return null
  }
}

export async function deleteGCalEvent(
  userId: string,
  gcalEventId: string | null
): Promise<void> {
  if (!gcalEventId) return
  const cal = await getCalendarForUser(userId)
  if (!cal) return
  try {
    await cal.events.delete({
      calendarId: 'primary',
      eventId: gcalEventId,
    })
  } catch (e) {
    console.error('[gcal] delete event failed', e)
  }
}
