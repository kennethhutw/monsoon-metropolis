// 🔵 MOCK DATA — 替換說明見下方 TODO
// TODO（合約）：CONTRACT_MODE=real 時，isRealHash=false 的記錄
// 替換為 Monad 真實查詢（等 monsoon-contracts 部署完成）

import { ChainRecord } from '@/types/chain'

export const MOCK_CHAIN_RECORDS: ChainRecord[] = [
  {
    blockNumber: 4821037,
    txHash: '0x3f8a2c4e91b4MOCKMOCKMOCK001',
    isRealHash: false,
    timestamp: new Date(Date.now() - 60000).toISOString(),
    txType: 'disbursement',
    companyName: 'Steelcraft Supplier #027',
    amount: 12500000,
    triggerCondition: 'Delivery Confirmed ✓',
    riskScore: 88,
  },
  {
    blockNumber: 4821031,
    txHash: '0xd42e9f8107c83MOCKMOCKMOCK002',
    isRealHash: false,
    timestamp: new Date(Date.now() - 480000).toISOString(),
    txType: 'anomaly',
    companyName: 'Formosa Precision Electronics',
    amount: 45000000,
    anomalyReason: 'Duplicate buyer financing detected',
    riskScore: 54,
  },
  {
    blockNumber: 4821028,
    txHash: '0xa19f5b2c38e21MOCKMOCKMOCK003',
    isRealHash: false,
    timestamp: new Date(Date.now() - 840000).toISOString(),
    txType: 'repayment',
    companyName: 'Pacific Ocean Shipping Co.',
    amount: 28750000,
    triggerCondition: 'Automatic repayment at maturity',
    riskScore: 67,
  },
]
