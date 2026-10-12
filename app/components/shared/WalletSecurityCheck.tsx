'use client'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'

// AML wallet risk screening — GoPlus Security Address Security API.
// See docs/changes/20260807_GoPlus錢包風險篩查.md

export interface WalletSecurityResult {
  checked: boolean
  flagged: boolean
  flags: string[]
}

const FLAG_LABELS: Record<string, string> = {
  phishing_activities: 'Phishing activity',
  blacklist_doubt: 'Blacklist doubt',
  blackmail_activities: 'Blackmail activity',
  cybercrime: 'Cybercrime',
  darkweb_transactions: 'Dark web transactions',
  fake_kyc: 'Fake KYC',
  fake_standard_interface: 'Fake standard interface',
  fake_token: 'Fake token',
  financial_crime: 'Financial crime',
  gas_abuse: 'Gas abuse',
  honeypot_related_address: 'Honeypot-related address',
  malicious_mining_activities: 'Malicious mining activity',
  mixer: 'Mixer usage',
  money_laundering: 'Money laundering',
  sanctioned: 'Sanctioned entity',
  stealing_attack: 'Stealing attack',
}

export function WalletSecurityCheck({
  address,
  label,
  onResult,
}: {
  address?: string
  label: string
  onResult?: (result: WalletSecurityResult) => void
}) {
  const [result, setResult] = useState<WalletSecurityResult | null>(null)

  useEffect(() => {
    if (!address) { setResult(null); return }
    setResult(null)
    fetch(`/api/contracts/wallet-security/${address}`)
      .then((r) => r.json())
      .then((d: WalletSecurityResult) => {
        setResult(d)
        onResult?.(d)
      })
      .catch(() => {
        const fallback = { checked: false, flagged: false, flags: [] }
        setResult(fallback)
        onResult?.(fallback)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  if (!address) return null

  if (!result) {
    return (
      <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldQuestion size={16} className="text-outline shrink-0" />
          <p className="text-body-md font-semibold text-ink">{label}</p>
        </div>
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  const tone = !result.checked ? 'unavailable' : result.flagged ? 'flagged' : 'clean'

  return (
    <div className={`rounded-lg border p-4 ${
      tone === 'flagged' ? 'bg-error-container/30 border-error/30'
      : tone === 'unavailable' ? 'bg-risk-medium/10 border-risk-medium/30'
      : 'bg-risk-low/10 border-risk-low/30'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {tone === 'flagged' ? <ShieldAlert size={16} className="text-error shrink-0" />
          : tone === 'unavailable' ? <ShieldQuestion size={16} className="text-risk-medium shrink-0" />
          : <ShieldCheck size={16} className="text-risk-low shrink-0" />}
        <p className="text-body-md font-semibold text-ink">{label}</p>
      </div>
      <p className={`text-body-md ${tone === 'flagged' ? 'text-error' : tone === 'unavailable' ? 'text-risk-medium' : 'text-risk-low'}`}>
        {tone === 'flagged' && `Risk flags found: ${result.flags.map((f) => FLAG_LABELS[f] ?? f).join(', ')}`}
        {tone === 'unavailable' && 'Screening unavailable — manual review recommended'}
        {tone === 'clean' && 'No risk flags found'}
      </p>
      <p className="text-label-md text-ink-faint mt-1.5">Powered by GoPlus Security</p>
    </div>
  )
}
