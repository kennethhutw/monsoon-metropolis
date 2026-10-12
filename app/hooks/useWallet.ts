'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useWalletClient, useSwitchChain } from 'wagmi'
import { formatUnits } from 'viem'
import { monadTestnet, contractAddresses, publicClient } from '@/lib/contracts/config'

export const isRealContractMode = process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'

const erc20BalanceAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const

export interface AtokenBalance {
  formatted: string
  symbol: string
}

// decimals/symbol are contract constants — fetch once and reuse across
// every wallet switch instead of re-querying them every time. Cuts the
// per-switch RPC load from 3 calls down to 1 (just balanceOf).
let atokenMetaCache: { decimals: number; symbol: string } | null = null
async function getAtokenMeta() {
  if (atokenMetaCache) return atokenMetaCache
  const [decimals, symbol] = await Promise.all([
    publicClient.readContract({ address: contractAddresses.stablecoin, abi: erc20BalanceAbi, functionName: 'decimals' }),
    publicClient.readContract({ address: contractAddresses.stablecoin, abi: erc20BalanceAbi, functionName: 'symbol' }),
  ])
  atokenMetaCache = { decimals, symbol }
  return atokenMetaCache
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Thin wrapper around wagmi so pages don't each pull in 4-5 separate hooks.
// Only meaningful in real mode — mock mode never needs a connected wallet.
export function useWallet() {
  const { address, isConnected, chainId } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: walletClient } = useWalletClient()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isWrongNetwork = isConnected && chainId !== monadTestnet.id

  // The A-Token (CVA) settlement balance — surfaced in the nav so it's
  // visible on every screen, not just the pages that actually move it.
  // Read directly via viem instead of wagmi's useBalance: the @wagmi/core
  // version pinned under wagmi/node_modules in this project ignores the
  // `token` param entirely and always returns the native MON balance.
  const [atokenBalance, setAtokenBalance] = useState<AtokenBalance | null>(null)
  useEffect(() => {
    if (!address || !isConnected || !isRealContractMode || isWrongNetwork) { setAtokenBalance(null); return }
    let cancelled = false

    const fetchBalance = async (retriesLeft: number): Promise<void> => {
      try {
        const [value, meta] = await Promise.all([
          publicClient.readContract({ address: contractAddresses.stablecoin, abi: erc20BalanceAbi, functionName: 'balanceOf', args: [address] }),
          getAtokenMeta(),
        ])
        if (cancelled) return
        setAtokenBalance({ formatted: formatUnits(value, meta.decimals), symbol: meta.symbol })
      } catch (error) {
        if (cancelled) return
        if (retriesLeft > 0) {
          await sleep(800)
          if (!cancelled) await fetchBalance(retriesLeft - 1)
          return
        }
        console.error('[useWallet] A-Token balance read failed:', error)
        setAtokenBalance(null)
      }
    }

    fetchBalance(1)
    return () => { cancelled = true }
  }, [address, isConnected, isWrongNetwork])

  return {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    isSwitching,
    walletClient,
    atokenBalance,
    connect: () => connect({ connector: connectors[0] }),
    disconnect,
    switchToMonad: () => switchChain({ chainId: monadTestnet.id }),
  }
}
