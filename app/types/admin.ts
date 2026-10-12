export interface AuditLog {
  id: string
  userId: string
  userEmail: string
  action: string
  resource: string
  detail?: string
  timestamp: string
}

export interface SystemHealth {
  chainConnected: boolean
  rpcProvider: 'default' | 'alchemy'
  aiStatus: 'ok' | 'down'
  aiProvider: string
  lastUpdated: string
  errors24h: number
}

export interface GlobalThresholds {
  buyerConcentrationLimit: number   // %，預設 40
  overdueRateRedLine: number        // %，預設 5
  singleBorrowerLimit: number       // 金額，預設 5,000,000
  travelRuleThresholdUsd: number    // Travel Rule 適用門檻(USD)，預設 1000
  updatedAt: string
  updatedBy: string | null
}
