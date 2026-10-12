import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'

// Minimal signed-cookie session — not a full auth framework, but a real
// server-verified credential instead of trusting whatever the client claims.
// See docs/changes/20260809_修復評審回饋三項缺失.md

export interface SessionPayload {
  id: string
  email: string
  role: string
}

export const SESSION_COOKIE_NAME = 'monsoon_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set — add it to .env.local (see .env.example)')
  return secret
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url')
}

export function createSessionToken(user: SessionPayload): string {
  const body = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  let expectedSigBuf: Buffer
  let sigBuf: Buffer
  try {
    expectedSigBuf = Buffer.from(sign(body))
    sigBuf = Buffer.from(sig)
  } catch {
    return null
  }
  if (sigBuf.length !== expectedSigBuf.length || !timingSafeEqual(sigBuf, expectedSigBuf)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'))
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null
    if (typeof payload.id !== 'string' || typeof payload.email !== 'string' || typeof payload.role !== 'string') return null
    return { id: payload.id, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}
