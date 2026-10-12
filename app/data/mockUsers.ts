// 🔵 MOCK DATA — 替換說明見下方 TODO
// TODO（Supabase Auth）：Phase 1 用 client-side 驗證
// 切換 Supabase 後，由 supabase.auth.signInWithPassword() 取代

import { MockUser } from '@/types/user'

export const MOCK_USERS: MockUser[] = [
  { id: 'u-001', email: 'bank@monsoon.demo',       password: 'demo1234',  role: 'bank',       name: 'David Lin',       organization: 'Meridian Commercial Bank — Trade Finance Division', isMock: true },
  { id: 'u-002', email: 'exporter@monsoon.demo',   password: 'demo1234',  role: 'exporter',   name: 'Sarah Tan',       organization: 'Formosa Precision Electronics Co., Ltd',             isMock: true },
  { id: 'u-003', email: 'importer@monsoon.demo',   password: 'demo1234',  role: 'importer',   name: 'James Whitfield', organization: 'Atlas Industrial Buyers Inc.',                       isMock: true },
  { id: 'u-004', email: 'researcher@monsoon.demo', password: 'demo1234',  role: 'researcher', name: 'Aisha Rahman',    organization: 'Asia Trade Finance Research Institute',              isMock: true },
  { id: 'u-005', email: 'admin@monsoon.demo',      password: 'admin5678', role: 'admin',      name: 'System Administrator', organization: 'Monsoon Platform',                              isMock: true },
]
