// 合約互動統一出口
// ⚠️ 不要在元件裡直接 import mock.ts 或 real.ts
// ⚠️ real.ts 讀取 ADMIN_PRIVATE_KEY,只能在 app/api/**/route.ts(server-only)使用

import { mockContracts } from './mock'
import { realContracts } from './real'

export const contracts =
  process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'
    ? realContracts
    : mockContracts

export type ContractInterface = typeof mockContracts
export { RoleType } from './types'
export type { RoleTypeValue, CVIRecord } from './types'
