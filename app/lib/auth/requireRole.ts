import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from './session'

// Real server-side authorization for API routes — the client-side RoleGuard
// only controls what's rendered, it never protected the API itself. See
// docs/changes/20260809_修復評審回饋三項缺失.md

export function getSession(request: NextRequest): SessionPayload | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)
}

export function requireRole(
  request: NextRequest,
  roles: string[]
): { session: SessionPayload; error?: undefined } | { session?: undefined; error: NextResponse } {
  const session = getSession(request)
  if (!session || !roles.includes(session.role)) {
    return { error: NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }) }
  }
  return { session }
}
