// Server-only Supabase client using the service role key — bypasses RLS.
// Used by API routes because the app's current login is still mock/session-
// storage based (not real Supabase Auth), so there's no auth.uid() for RLS
// policies to key off yet. See docs/changes/20260802_Exporter申請案件真實API.md.

import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
