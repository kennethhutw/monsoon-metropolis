import 'server-only'
import { createPublicClient, http } from 'viem'
import { monadTestnet } from './config'

export type RpcProvider = 'default' | 'alchemy'

export function getRpcProvider(): RpcProvider {
  return process.env.RPC_PROVIDER === 'alchemy' ? 'alchemy' : 'default'
}

function getRpcUrl(provider: RpcProvider): string {
  if (provider === 'alchemy') {
    const key = process.env.ALCHEMY_API_KEY
    if (!key) {
      throw new Error('RPC_PROVIDER is "alchemy" but ALCHEMY_API_KEY is not set — add it to .env.local')
    }
    return `https://monad-testnet.g.alchemy.com/v2/${key}`
  }
  return process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz/'
}

// Server-only public client for admin/monitoring reads. Deliberately separate
// from the shared `publicClient` in config.ts — that one is imported by
// client components too, so it must never carry ALCHEMY_API_KEY.
export function getServerPublicClient() {
  return createPublicClient({
    chain: monadTestnet,
    transport: http(getRpcUrl(getRpcProvider())),
  })
}
