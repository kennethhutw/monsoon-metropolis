'use client'
import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'
import { CvaEligibilityCard } from '@/components/shared/CvaEligibilityCard'
import { WalletSecurityCheck } from '@/components/shared/WalletSecurityCheck'
import { BadgeCheck, AlertTriangle, Wallet } from 'lucide-react'

// Importer's identity/settlement verification page — mirrors
// app/exporter/kyb/page.tsx's real-mode flow. See
// docs/changes/20260806_CVA資格檢查與申請.md

const ROLE_LABELS = ['None', 'Exporter', 'Buyer', 'Bank', 'Admin']

interface CVILookup {
  isVerified: boolean
  record: { isActive: boolean; issuedAt: string; expiresAt: string; cviTokenId: string; kybDataHash: string; role: number }
  cleanverse: {
    cvRecordId: string
    tier: string
    subTier: number
    status: 1 | 2
    expirationTime: number
    group: string
    subGroup: string
    countries: string[]
  } | null
}

function RealModeVerification() {
  const { address, isConnected } = useWallet()
  const [data, setData] = useState<CVILookup | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!address) return
    setLoading(true)
    setError(null)
    fetch(`/api/contracts/cvi/${address}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error)
        setData(json)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lookup failed'))
      .finally(() => setLoading(false))
  }, [address])

  if (!isConnected) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-12 text-center">
        <Wallet size={32} className="mx-auto mb-4 text-outline" />
        <h2 className="text-title-lg font-bold text-on-surface mb-2">Connect Your Wallet</h2>
        <p className="text-body-md text-on-surface-variant mb-5 max-w-sm mx-auto">
          Verification status is read directly from ComplianceRegistry on Monad Testnet — connect the wallet you registered with to view it.
        </p>
        <div className="flex justify-center"><ConnectWalletButton /></div>
      </div>
    )
  }

  if (loading) {
    return <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-12 text-center text-body-md text-on-surface-variant">Reading ComplianceRegistry on Monad Testnet…</div>
  }

  if (error) {
    return <div className="bg-error-container/40 border border-error/30 rounded-xl p-6 text-body-md text-error">{error}</div>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {data.cleanverse && (
        <div className="bg-primary rounded-xl p-6 text-on-primary">
          <div className="flex items-center justify-between mb-4">
            <p className="text-label-md uppercase tracking-wider opacity-80 font-mono">Cleanverse A-Pass (CVI) — Live Sandbox</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-md font-bold ${data.cleanverse.status === 1 ? 'bg-white/20' : 'bg-error/40'}`}>
              {data.cleanverse.status === 1 ? 'Active' : 'Frozen'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-label-md opacity-70 font-mono mb-0.5">CV Record ID</p>
              <p className="text-body-md font-semibold font-mono truncate">{data.cleanverse.cvRecordId}</p>
            </div>
            <div>
              <p className="text-label-md opacity-70 font-mono mb-0.5">Tier / Sub-Tier</p>
              <p className="text-body-md font-semibold">{data.cleanverse.tier} / {data.cleanverse.subTier}</p>
            </div>
            <div>
              <p className="text-label-md opacity-70 font-mono mb-0.5">Countries</p>
              <p className="text-body-md font-semibold">{data.cleanverse.countries.join(', ') || '—'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-md font-bold mb-3 ${data.isVerified ? 'bg-risk-low/15 text-risk-low' : 'bg-risk-medium/15 text-risk-medium'}`}>
              {data.isVerified ? <BadgeCheck size={14} /> : <AlertTriangle size={14} />}
              {data.isVerified ? 'Verified on-chain' : 'No active CVI found for this wallet'}
            </span>
            <h2 className="text-headline-lg font-bold text-on-surface">{ROLE_LABELS[data.record.role] ?? 'Unknown'}</h2>
            <p className="text-body-md text-on-surface-variant mt-1">ComplianceRegistry.getCVIRecord() — Monad Testnet mirror</p>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${data.isVerified ? 'bg-risk-low/10' : 'bg-risk-medium/10'}`}>
            {data.isVerified ? <BadgeCheck size={36} className="text-risk-low" /> : <AlertTriangle size={36} className="text-risk-medium" />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border-subtle">
          <div>
            <label className="text-label-md uppercase text-outline block mb-1 font-mono">CVI Token ID</label>
            <p className="text-body-md font-semibold text-ink break-all">{data.record.cviTokenId || '—'}</p>
          </div>
          <div>
            <label className="text-label-md uppercase text-outline block mb-1 font-mono">Expires</label>
            <p className="text-body-md font-semibold text-ink">{data.record.expiresAt === '0' ? 'No expiry' : new Date(Number(data.record.expiresAt) * 1000).toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-6">
          <label className="text-label-md uppercase text-outline block mb-1 font-mono">Connected Wallet Address</label>
          <div className="w-full flex items-center gap-2 bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2.5">
            <code className="text-code-sm text-on-surface font-mono flex-1 text-left truncate">{address}</code>
          </div>
        </div>
        {!data.isVerified && (
          <p className="text-body-md text-on-surface-variant mt-4">This wallet has no active CVI record. An admin needs to issue one via KYB approval (Cleanverse generate_apass + ComplianceRegistry.registerCVI).</p>
        )}
      </div>

      <CvaEligibilityCard address={address!} role="importer" />
      <WalletSecurityCheck address={address} label="Your Wallet" />
    </div>
  )
}

export default function ImporterKYBPage() {
  return (
    <PageLayout title="Verification" subtitle="Buyer identity and A-Token settlement eligibility">
      <div className="max-w-3xl">
        {isRealContractMode ? (
          <RealModeVerification />
        ) : (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-8 text-center">
            <BadgeCheck size={36} className="mx-auto mb-3 text-risk-low" />
            <p className="text-title-lg font-bold text-on-surface mb-1">Verified</p>
            <p className="text-body-md text-on-surface-variant">This buyer account is CVI-verified and eligible for CVA settlement. (Mock mode — always verified.)</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
