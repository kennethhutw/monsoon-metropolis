import { NextResponse } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

// Clears the httpOnly session cookie set on login. Client-side sessionStorage
// (the UI's own role display state) is cleared separately by the caller —
// this route only owns the real server-verified credential.
export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, '', { httpOnly: true, maxAge: 0, path: '/' })
  return response
}
