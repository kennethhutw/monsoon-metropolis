'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'
import { CvaEligibilityCard } from '@/components/shared/CvaEligibilityCard'
import { WalletSecurityCheck } from '@/components/shared/WalletSecurityCheck'
import {
  BadgeCheck, AlertTriangle, Download, RefreshCw, Copy, Radio, CheckCircle2, Circle, Wallet,
} from 'lucide-react'

const KYB_DATA = {
  companyName: 'Formosa Precision Electronics Co., Ltd',
  taxId: '12345678',
  chainAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  network: 'Monad Testnet',
  verifiedAt: '2024-03-01 09:00:00',
  expiresAt: '2025-03-01 09:00:00',
  txHash: '0xb5c2d8a9e3f1047c6b8d2e5a3f9c1b7e4d2a8f6c3e1b9d7a5c4f2e8b6d0a3f1',
  certificateId: 'KYB-TW-2024-001234',
  status: 'verified' as const,
}

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

function RealModeKYB() {
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
          KYB verification status is read directly from ComplianceRegistry on Monad Testnet — connect the wallet you registered with to view it.
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

      <CvaEligibilityCard address={address!} role="exporter" />
      <WalletSecurityCheck address={address} label="Your Wallet" />
    </div>
  )
}

function InfoField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="text-label-md uppercase text-outline block mb-1 font-mono">{label}</label>
      <p className={`text-body-md font-semibold text-ink break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

export default function ExporterKYBPage() {
  const [renewing, setRenewing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleRenew = async () => {
    setRenewing(true)
    // TODO（Supabase）: trigger KYB re-verification flow
    await new Promise(r => setTimeout(r, 1200))
    setRenewing(false)
    toast.success('Re-verification request submitted', {
      description: 'Review typically takes 1–3 business days; you will be notified once complete.',
    })
  }

  const handleDownload = async () => {
    setDownloading(true)
    await new Promise(r => setTimeout(r, 600))
    setDownloading(false)
    toast.success('Verification certificate downloaded', {
      description: `Certificate ID: ${KYB_DATA.certificateId}`,
    })
  }

  const handleCopyAddress = () => {
    navigator.clipboard?.writeText(KYB_DATA.chainAddress)
    toast.success('Address copied')
  }

  // Check if expiry is within 60 days
  const daysUntilExpiry = Math.ceil(
    (new Date(KYB_DATA.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  const isExpiringSoon = daysUntilExpiry < 60

  return (
    <PageLayout title="KYB Verification" subtitle="Company identity verification status">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main column */}
        <div className="lg:col-span-8 space-y-6">
          {isRealContractMode ? (
            <RealModeKYB />
          ) : (
            <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-risk-low/15 text-risk-low text-label-md font-bold mb-3">
                    <BadgeCheck size={14} /> Verified · Active until {KYB_DATA.expiresAt.slice(0, 10)}
                  </span>
                  <h2 className="text-headline-lg font-bold text-on-surface">{KYB_DATA.companyName}</h2>
                  <p className="text-body-md text-on-surface-variant mt-1">Business Entity Verified On-Chain</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-risk-low/10 flex items-center justify-center shrink-0">
                  <BadgeCheck size={36} className="text-risk-low" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border-subtle">
                <InfoField label="Tax ID" value={KYB_DATA.taxId} mono />
                <InfoField label="Certificate ID" value={KYB_DATA.certificateId} mono />
              </div>
              <div className="mt-6">
                <label className="text-label-md uppercase text-outline block mb-1 font-mono">On-Chain Address</label>
                <button onClick={handleCopyAddress} className="w-full flex items-center gap-2 bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2.5 hover:border-primary-container transition-colors group">
                  <code className="text-code-sm text-on-surface font-mono flex-1 text-left truncate">{KYB_DATA.chainAddress}</code>
                  <Copy size={14} className="text-outline group-hover:text-primary shrink-0" />
                </button>
              </div>
            </div>
          )}

          {!isRealContractMode && isExpiringSoon && (
            <div className="flex items-center gap-3 p-4 bg-risk-medium/10 rounded-xl border border-risk-medium/30">
              <AlertTriangle size={20} className="text-risk-medium shrink-0" />
              <div className="flex-1">
                <p className="text-body-md font-semibold text-ink">Verification Renewal Notice</p>
                <p className="text-body-md text-on-surface-variant">Your KYB credentials expire in <strong>{daysUntilExpiry} days</strong>. Start renewal now to ensure uninterrupted access to trade financing.</p>
              </div>
              <button
                onClick={handleRenew}
                disabled={renewing}
                className="px-4 py-2 bg-risk-medium text-white rounded-lg text-body-md font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {renewing ? 'Submitting...' : 'Start Renewal'}
              </button>
            </div>
          )}

          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <h2 className="text-title-lg font-bold mb-4">Blockchain History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead>
                  <tr className="border-b border-border-subtle text-label-md text-outline uppercase font-mono">
                    <th className="text-left font-medium py-2">Transaction ID</th>
                    <th className="text-left font-medium py-2">Event Type</th>
                    <th className="text-left font-medium py-2">Status</th>
                    <th className="text-right font-medium py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 font-mono text-primary text-code-sm">{KYB_DATA.txHash.slice(0, 8)}…{KYB_DATA.txHash.slice(-4)}</td>
                    <td className="py-3">On-Chain Attestation</td>
                    <td className="py-3"><span className="inline-flex items-center gap-1 text-risk-low"><CheckCircle2 size={14} /> Confirmed</span></td>
                    <td className="py-3 text-right text-ink-faint">{KYB_DATA.verifiedAt.slice(0, 10)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-label-md text-ink-faint mt-3">🔵 MOCK — in production this will be viewable on the Monad block explorer</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-primary rounded-xl p-6 text-on-primary">
            <p className="text-label-md uppercase tracking-wider opacity-80 font-mono mb-1">Network</p>
            <p className="text-headline-md font-bold mb-3">{KYB_DATA.network}</p>
            <div className="flex items-center gap-2 text-body-md">
              <Radio size={14} className="animate-pulse" />
              Live Verification Node
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <h3 className="text-title-lg font-bold mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-lg text-body-md font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Download size={16} /> {downloading ? 'Downloading...' : 'Download Certificate'}
              </button>
              {!isRealContractMode && (
                <button
                  onClick={handleRenew}
                  disabled={renewing}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-border-subtle rounded-lg text-on-surface text-body-md font-semibold hover:bg-surface-container-low disabled:opacity-50 transition-all"
                >
                  <RefreshCw size={16} /> {renewing ? 'Submitting...' : 'Request Re-Verification'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <h3 className="text-title-lg font-bold mb-4">Verification Timeline</h3>
            <div className="relative pl-5 space-y-5">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border-subtle" />
              <div className="relative">
                <CheckCircle2 size={14} className="absolute -left-5 top-0.5 text-primary bg-surface" />
                <p className="text-body-md font-semibold text-ink">Attestation Finalized</p>
                <p className="text-label-md text-ink-faint">{KYB_DATA.verifiedAt}</p>
              </div>
              <div className="relative">
                <Circle size={14} className="absolute -left-5 top-0.5 text-outline-variant bg-surface" />
                <p className="text-body-md font-semibold text-ink-faint">Renewal Due</p>
                <p className="text-label-md text-ink-faint">{KYB_DATA.expiresAt}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
