// 🔵 MOCK DATA — 替換說明見下方 TODO
// TODO（Supabase）：替換為聚合查詢或 Supabase View

export interface DashboardStats {
  approvedAmountThisMonth: number
  pendingCasesCount: number
  avgProcessingDays: number
  overdueRate: number
  chainDataCoverageRate: number
  isMock?: true
}

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  approvedAmountThisMonth: 186400000,
  pendingCasesCount: 127,
  avgProcessingDays: 3.2,
  overdueRate: 0.87,
  chainDataCoverageRate: 94.1,
  isMock: true,
}
