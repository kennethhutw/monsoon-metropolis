'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Wallet, AlertTriangle, Copy, LogOut, ChevronDown, Coins } from 'lucide-react'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

// cvaEligible: pass the wallet's CVA/CVI verification status when known
// (exporter/importer roles) so this pill doesn't read as "all good" (green)
// just because a wallet is connected — connected and verified are different
// things. Leave undefined/null for roles where it doesn't apply (bank/admin/
// researcher) or while the check is still loading; it stays green in that case.
export function ConnectWalletButton({ cvaEligible }: { cvaEligible?: boolean | null } = {}) {
  const { address, isConnected, isConnecting, isWrongNetwork, isSwitching, atokenBalance, connect, disconnect, switchToMonad } = useWallet()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  if (!isRealContractMode) return null

  const handleConnect = async () => {
    try {
      await connect()
    } catch {
      toast.error('Wallet connection failed', { description: 'Is MetaMask (or another injected wallet) installed?' })
    }
  }

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard?.writeText(address)
    toast.success('Address copied')
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchToMonad()}
        disabled={isSwitching}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-risk-medium/15 text-risk-medium border border-risk-medium/30 text-body-md font-semibold hover:bg-risk-medium/25 transition-colors disabled:opacity-50"
      >
        <AlertTriangle size={16} />
        {isSwitching ? 'Switching…' : 'Switch to Monad Testnet'}
      </button>
    )
  }

  if (isConnected && address) {
    const notVerified = cvaEligible === false
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-body-md font-semibold transition-colors ${
            notVerified
              ? 'bg-risk-medium/10 text-risk-medium border-risk-medium/30 hover:bg-risk-medium/20'
              : 'bg-risk-low/10 text-risk-low border-risk-low/30 hover:bg-risk-low/20'
          }`}
        >
          {notVerified
            ? <AlertTriangle size={14} className="shrink-0" />
            : <span className="w-2 h-2 rounded-full bg-risk-low shrink-0" />}
          <span className="font-mono text-code-sm">{truncate(address)}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>
        {atokenBalance && (
          <div className="mt-1.5 px-1 space-y-1">
            <p
              className="text-label-md text-ink font-mono font-semibold truncate"
              title={`${atokenBalance.formatted} ${atokenBalance.symbol}`}
            >
              {Number(atokenBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              <span className="text-ink-faint truncate">{atokenBalance.symbol}</span>
            </p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide font-mono">
              <Coins size={10} className="shrink-0" /> A-Token
            </span>
          </div>
        )}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-surface border border-border-subtle rounded-lg shadow-modal py-1 z-50">
            {notVerified && (
              <p className="px-3 py-2 text-label-md text-risk-medium border-b border-border-subtle">Not CVA-verified yet</p>
            )}
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-2 text-body-md text-on-surface hover:bg-surface-container-low transition-colors"
            >
              <Copy size={14} /> Copy address
            </button>
            <button
              onClick={() => disconnect()}
              className="w-full flex items-center gap-2 px-3 py-2 text-body-md text-error hover:bg-surface-container-low transition-colors"
            >
              <LogOut size={14} /> Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-body-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      <Wallet size={16} />
      {isConnecting ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
}
