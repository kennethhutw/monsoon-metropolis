import { createAdminClient } from './admin'

// Shared helper so every admin write path logs consistently (CLAUDE.md rule
// 7: "所有 Admin 操作 → 必須寫入稽核日誌"). Never throws — a logging failure
// shouldn't fail the admin action that triggered it.
export async function writeAuditLog(
  supabase: ReturnType<typeof createAdminClient>,
  actorEmail: string | undefined,
  action: string,
  resource: string,
  detail?: string
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      user_email: actorEmail ?? 'unknown',
      action,
      resource,
      detail,
    })
  } catch (error) {
    console.error('[auditLog] write failed:', error)
  }
}
