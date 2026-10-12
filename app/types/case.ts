export type RiskLevel = 'high' | 'medium' | 'low'

export type CaseStage =
  | 'submitted'
  | 'ai_review'
  | 'credit_committee'
  | 'approved'
  | 'rejected'

export type FinanceType = 'receivables' | 'supply_chain' | 'trade'

export interface FinanceCase {
  id: string
  companyName: string
  financeType: FinanceType
  amount: number                // USD，整數
  stage: CaseStage
  riskLevel: RiskLevel
  riskScore: number             // 0-100
  buyerConcentration: number    // 0-100，%
  invoiceHash?: string          // keccak256 hex
  chainTxHash?: string          // Sepolia tx hash
  createdAt: string             // ISO 8601
  updatedAt: string
  isMock?: true                 // 🔵 Mock 數據標記，正式版移除

  buyerName?: string
  invoiceNumber?: string
  dueDate?: string              // ISO 8601 date，發票到期日/融資天期
  currency?: string              // 目前固定 'USD'，先加欄位為未來多幣別鋪路
  industry?: string
  buyerCountry?: string
  exporterCountry?: string

  // real 模式才會有值 — 對應鏈上 InvoiceAsset / FinancingPool 的實際狀態
  invoiceTokenId?: number       // InvoiceAsset tokenId，mint 後才有
  financingCaseId?: number      // FinancingPool caseId，submitCase 後才有
  exporterWallet?: string
  buyerWallet?: string
  buyerConfirmedAt?: string     // ISO 8601 — confirmReceivable() 成功時間
  buyerConfirmedTxHash?: string
  submittedTxHash?: string      // submitCase()
  submittedAt?: string
  approvedTxHash?: string       // approveCase()
  approvedAt?: string
  rejectedTxHash?: string       // rejectCase()
  rejectedAt?: string
  disbursedTxHash?: string      // disburse()
  disbursedAt?: string
  repaidTxHash?: string         // repay()
  repaidAt?: string
}

export interface ApiError {
  error: string
  code: string
}
