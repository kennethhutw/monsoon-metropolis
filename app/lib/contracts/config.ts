// Monad Testnet chain + client config for real contract mode.
// Chain ID / RPC verified against docs.monad.xyz — kept in sync with
// Monsoon_contract/hardhat.config.ts.

import { createPublicClient, createWalletClient, http, defineChain, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
})

export function explorerTxUrl(txHash: string): string {
  return `${monadTestnet.blockExplorers.default.url}/tx/${txHash}`
}

export function explorerAddressUrl(address: string): string {
  return `${monadTestnet.blockExplorers.default.url}/address/${address}`
}

function requireAddress(envVar: string, value: string | undefined): Address {
  if (!value || !value.startsWith('0x')) {
    throw new Error(`Contract mode is "real" but ${envVar} is not set — add it to .env.local`)
  }
  return value as Address
}

export const contractAddresses = {
  get complianceRegistry() {
    return requireAddress('NEXT_PUBLIC_COMPLIANCE_REGISTRY', process.env.NEXT_PUBLIC_COMPLIANCE_REGISTRY)
  },
  get invoiceAsset() {
    return requireAddress('NEXT_PUBLIC_INVOICE_ASSET', process.env.NEXT_PUBLIC_INVOICE_ASSET)
  },
  get financingPool() {
    return requireAddress('NEXT_PUBLIC_FINANCING_POOL', process.env.NEXT_PUBLIC_FINANCING_POOL)
  },
  get stablecoin() {
    return requireAddress('NEXT_PUBLIC_STABLECOIN', process.env.NEXT_PUBLIC_STABLECOIN)
  },
}

// Read-only client — safe to use from server routes; no secrets involved.
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

// Server-only signer for platform-issued actions (ComplianceRegistry is
// onlyAdmin — this represents the platform/Cleanverse-oracle issuing CVI,
// not an end user's wallet). NEVER import this from a 'use client' file.
// Mirrors the ANTHROPIC_API_KEY server-only pattern already used in this repo.
export function getAdminWalletClient() {
  const key = process.env.ADMIN_PRIVATE_KEY
  if (!key) {
    throw new Error('ADMIN_PRIVATE_KEY is not set — required for real-mode admin actions (see .env.example)')
  }
  const account = privateKeyToAccount(key as `0x${string}`)
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  })
}
