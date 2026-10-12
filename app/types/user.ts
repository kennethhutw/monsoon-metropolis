export type UserRole =
  | 'bank'
  | 'exporter'
  | 'importer'
  | 'researcher'
  | 'admin'

export interface AppUser {
  id: string
  email: string
  role: UserRole
  name: string
  organization: string
}

// Mock 專用，正式版由 Supabase Auth 取代
export interface MockUser extends AppUser {
  password: string
  isMock: true
}

// /admin/users 列表用 — 對應 public.users 表，見
// docs/changes/20260806_使用者管理真實化.md
export interface AdminUserRow {
  id: string
  email: string
  role: UserRole
  name: string
  organization: string
  walletAddress: string | null
  isSeed: boolean
  nftCount: number
  createdAt: string
}
