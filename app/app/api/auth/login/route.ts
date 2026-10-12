import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/lib/auth/session'

// Server-side credential check against public.users. Previously this
// comparison ran client-side against a hardcoded array (data/mockUsers.ts),
// which shipped every demo password into the browser bundle — this route
// replaces that without changing the client-facing AppUser shape.
// See docs/changes/20260806_使用者管理真實化.md

export async function POST(request: NextRequest) {
  try {
    const { email, password } = (await request.json()) as { email?: string; password?: string }
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, name, organization')
      .ilike('email', email)
      .eq('password', password)
      .maybeSingle()
    if (error) throw error
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = createSessionToken({ id: user.id, email: user.email, role: user.role })
    const response = NextResponse.json(user)
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    })
    return response
  } catch (error) {
    console.error('[API] auth/login error:', error)
    return NextResponse.json({ error: 'Login failed', code: 'LOGIN_ERROR' }, { status: 500 })
  }
}
