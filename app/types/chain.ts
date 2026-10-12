export type TxType =
  | 'disbursement'
  | 'repayment'
  | 'anomaly'
  | 'identity_reg'

export interface ChainRecord {
  blockNumber: number
  txHash: string
  isRealHash: boolean           // true = Sepolia 真實，false = 模擬
  timestamp: string
  txType: TxType
  companyName: string
  amount?: number
  triggerCondition?: string
  riskScore?: number
  anomalyReason?: string        // txType === 'anomaly' 時必填
}
