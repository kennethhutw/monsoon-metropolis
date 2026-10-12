// Shared types between mock.ts and real.ts — kept separate so mock mode
// never has to import the real (server-only, ADMIN_PRIVATE_KEY-using) module.

import type { Hash } from 'viem'

export const RoleType = { NONE: 0, EXPORTER: 1, BUYER: 2, BANK: 3, ADMIN: 4 } as const
export type RoleTypeValue = (typeof RoleType)[keyof typeof RoleType]

export interface CVIRecord {
  isActive: boolean
  issuedAt: bigint
  expiresAt: bigint
  cviTokenId: string
  kybDataHash: Hash
  role: number
}
