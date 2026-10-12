'use client'
import { contracts } from '@/lib/contracts'

// 合約互動 Hook（依 NEXT_PUBLIC_CONTRACT_MODE 自動切換 mock/real）
export function useContract() {
  return contracts
}
