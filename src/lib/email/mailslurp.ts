/**
 * Minimal MailSlurp client used by the shadow-roster seeder.
 *
 * Only the bits we need:
 *   - createInbox({ name }) → { id, emailAddress }
 *   - listInboxes()         → [{ id, name, emailAddress }]  (for idempotency)
 *   - deleteInbox(id)       → void                          (teardown)
 *
 * We talk to the REST API directly (no SDK) so this file stays tiny
 * and zero-dependency. API reference:
 *   https://docs.mailslurp.com/api
 *
 * Env:
 *   MAILSLURP_API_KEY  (required)
 *   MAILSLURP_BASE_URL (optional, defaults to https://api.mailslurp.com)
 */

export type MailSlurpInbox = {
  id: string
  name: string | null
  emailAddress: string
}

function baseUrl(): string {
  return (
    process.env.MAILSLURP_BASE_URL?.replace(/\/+$/, '') ??
    'https://api.mailslurp.com'
  )
}

function apiKey(): string {
  const k = process.env.MAILSLURP_API_KEY?.trim()
  if (!k) {
    throw new Error(
      'MAILSLURP_API_KEY is not set. Add it to .env.local before running the seeder.',
    )
  }
  return k
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      'x-api-key': apiKey(),
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`MailSlurp ${method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

/**
 * Create a new inbox. Name is stored on the inbox for later lookup so
 * repeated seeder runs can reuse an existing inbox instead of
 * creating a new one for the same person.
 */
export async function createInbox(params: {
  name: string
  description?: string
}): Promise<MailSlurpInbox> {
  const created = await request<{
    id: string
    name?: string | null
    emailAddress: string
  }>('POST', '/inboxes', {
    name: params.name,
    description: params.description ?? null,
    // Use MailSlurp's free-tier SMTP-capable inbox by default.
    inboxType: 'HTTP_INBOX',
    useDomainPool: true,
  })
  return {
    id: created.id,
    name: created.name ?? params.name,
    emailAddress: created.emailAddress,
  }
}

/**
 * List every inbox on the account. Paginated in the underlying API;
 * we page through all of them because the seeder relies on a full
 * map for idempotency.
 */
export async function listInboxes(): Promise<MailSlurpInbox[]> {
  type Page = {
    content: Array<{ id: string; name?: string | null; emailAddress: string }>
    totalPages: number
    number: number
  }
  const out: MailSlurpInbox[] = []
  let page = 0
  while (true) {
    const data = await request<Page>(
      'GET',
      `/inboxes/paginated?page=${page}&size=100&sort=ASC`,
    )
    for (const r of data.content ?? []) {
      out.push({
        id: r.id,
        name: r.name ?? null,
        emailAddress: r.emailAddress,
      })
    }
    if (!data.totalPages || page >= data.totalPages - 1) break
    page += 1
  }
  return out
}

/** Idempotent: reuse existing inbox by exact name if present. */
export async function ensureInbox(name: string): Promise<MailSlurpInbox> {
  const existing = await listInboxes()
  const match = existing.find((i) => (i.name ?? '').trim() === name.trim())
  if (match) return match
  return createInbox({ name })
}

export async function deleteInbox(id: string): Promise<void> {
  await request<void>('DELETE', `/inboxes/${encodeURIComponent(id)}`)
}
