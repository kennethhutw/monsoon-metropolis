import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { AuditLog } from '@/types/admin'

// Real audit_log rows — /admin/users' create/edit/reset-password actions
// already write here via lib/supabase/auditLog.ts. See
// docs/changes/20260806_Admin控制台分層架構.md

interface AuditLogRow {
  id: string
  user_id: string | null
  user_email: string
  action: string
  resource: string
  detail: string | null
  timestamp: string
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin'])
  if (auth.error) return auth.error
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('audit_log')
      .select('id, user_id, user_email, action, resource, detail, timestamp')
      .order('timestamp', { ascending: false })
      .limit(200)
    if (error) throw error

    const logs: AuditLog[] = (data as AuditLogRow[] ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id ?? '',
      userEmail: row.user_email,
      action: row.action,
      resource: row.resource,
      detail: row.detail ?? undefined,
      timestamp: row.timestamp,
    }))

    return NextResponse.json(logs)
  } catch (error) {
    console.error('[API] admin/audit-log error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit log', code: 'AUDIT_LOG_FETCH_ERROR' },
      { status: 500 }
    )
  }
}
