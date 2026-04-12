import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function keyBytes(): Buffer {
  const raw = process.env.GCAL_TOKEN_ENCRYPTION_KEY ?? ''
  if (raw.length === 32) return Buffer.from(raw, 'utf8')
  return createHash('sha256').update(raw).digest()
}

export function encryptToken(plain: string): string {
  const key = keyBytes()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.')
}

export function decryptToken(payload: string): string | null {
  try {
    const parts = payload.split('.')
    if (parts.length !== 3) return null
    const iv = Buffer.from(parts[0]!, 'base64')
    const tag = Buffer.from(parts[1]!, 'base64')
    const data = Buffer.from(parts[2]!, 'base64')
    const key = keyBytes()
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
