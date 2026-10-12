'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { zeroHash } from 'viem'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import { CaseActivityTimeline } from '@/components/shared/CaseActivityTimeline'
import { NewsScanPanel } from '@/components/shared/NewsScanPanel'
import { AiAssessmentPanel } from '@/components/shared/AiAssessmentPanel'
import { WalletSecurityCheck, type WalletSecurityResult } from '@/components/shared/WalletSecurityCheck'
import { TravelRulePanel } from '@/components/shared/TravelRulePanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'
import { publicClient, contractAddresses, explorerTxUrl, explorerAddressUrl } from '@/lib/contracts/config'
import { financingPoolAbi } from '@/lib/contracts/abis/financingPool'
import { approveCase, rejectCase, disburse } from '@/lib/contracts/walletActions'
import { toastTxSuccess } from '@/lib/toastTx'
import { formatUSD, formatDate, formatDateOnly, getRiskColor, getRiskBg } from '@/lib/utils'
import { FinanceCase, CaseStage } from '@/types/case'
import { ShieldCheck, Link2, CheckCircle2, XCircle, ArrowLeft, Banknote } from 'lucide-react'

const STAGE_LABEL: Record<CaseStage, string> = {
  submitted: 'Submitted', ai_review: 'AI Review',
  credit_committee: 'Credit Committee', approved: 'Approved', rejected: 'Rejected',
}
const STAGE_TONE: Record<CaseStage, string> = {
  submitted: 'bg-surface-container-highest text-on-surface-variant',
  ai_review: 'bg-primary-fixed text-primary',
  credit_committee: 'bg-risk-medium/15 text-risk-medium',
  approved: 'bg-risk-low/15 text-risk-low',
  rejected: 'bg-risk-high/15 text-risk-high',
}
const RISK_LABEL: Record<'low' | 'medium' | 'high', string> = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }

// FinancingPool.CaseStatus enum ordering
const CASE_STATUS = { PENDING_APPROVAL: 0, APPROVED: 1, DISBURSED: 2, REPAID: 3, DEFAULTED: 4, REJECTED: 5 } as const

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <label className="text-label-md uppercase text-outline block mb-1 font-mono">{label}</label>
      <p className="text-body-md font-medium text-ink">{value}</p>
    </div>
  )
}

function HashField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="col-span-2">
      <label className="text-label-md uppercase text-outline block mb-1 font-mono">{label}</label>
      <div className="flex items-center gap-3 bg-surface-container-low p-3 rounded-lg border border-border-subtle">
        <Link2 size={16} className="text-outline shrink-0" />
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-code-sm text-primary hover:underline truncate flex-1 font-mono">
            {value}
          </a>
        ) : (
          <code className="text-code-sm text-on-surface truncate flex-1 font-mono">{value}</code>
        )}
      </div>
    </div>
  )
}

const ACTIONABLE_STAGES: CaseStage[] = ['submitted', 'ai_review', 'credit_committee']

function RealModeActions({ c, onUpdated, onTravelRuleChange }: { c: FinanceCase; onUpdated: (patch: Partial<FinanceCase>) => void; onTravelRuleChange?: () => void }) {
  const { isConnected, isWrongNetwork, walletClient } = useWallet()
  const [onChainStatus, setOnChainStatus] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [exporterSecurity, setExporterSecurity] = useState<WalletSecurityResult | null>(null)
  const [buyerSecurity, setBuyerSecurity] = useState<WalletSecurityResult | null>(null)

  const load = useCallback(async () => {
    if (c.financingCaseId == null) return
    try {
      const financingCase = await publicClient.readContract({
        address: contractAddresses.financingPool,
        abi: financingPoolAbi,
        functionName: 'getCase',
        args: [BigInt(c.financingCaseId)],
      })
      setOnChainStatus(financingCase.status)
    } catch (error) {
      console.error('[FinancingPool.getCase] read failed:', error)
    }
  }, [c.financingCaseId])

  useEffect(() => { load() }, [load])

  if (c.financingCaseId == null) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
        <h2 className="text-title-lg font-bold mb-2">Review Actions</h2>
        <p className="text-body-md text-on-surface-variant">This case hasn&apos;t been submitted for financing on-chain yet — the exporter can submit it once the buyer confirms the receivable.</p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 flex items-center justify-between gap-3">
        <p className="text-body-md text-on-surface-variant">Connect the bank wallet to review FinancingPool case #{c.financingCaseId}.</p>
        <ConnectWalletButton />
      </div>
    )
  }
  if (isWrongNetwork) {
    return <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6"><p className="text-body-md text-risk-medium">Switch to Monad Testnet to continue.</p></div>
  }

  const handleApprove = async () => {
    if (!walletClient || c.financingCaseId == null) return
    setBusy(true)
    try {
      const { txHash } = await approveCase(walletClient, BigInt(c.financingCaseId), BigInt(c.riskScore), (c.invoiceHash as `0x${string}`) ?? zeroHash)
      const approvedAt = new Date().toISOString()
      onUpdated({ stage: 'approved', approvedTxHash: txHash, approvedAt })
      await fetch(`/api/mock/cases/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'approved', approvedTxHash: txHash, approvedAt }) })
      toastTxSuccess('Case approved on-chain', txHash, `FinancingPool case #${c.financingCaseId}`)
      await load()
    } catch (error) {
      console.error('[approveCase] failed:', error)
      toast.error('Approval failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!walletClient || c.financingCaseId == null) return
    setBusy(true)
    try {
      const { txHash } = await rejectCase(walletClient, BigInt(c.financingCaseId), 'Rejected by bank reviewer')
      const rejectedAt = new Date().toISOString()
      onUpdated({ stage: 'rejected', rejectedTxHash: txHash, rejectedAt })
      await fetch(`/api/mock/cases/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: 'rejected', rejectedTxHash: txHash, rejectedAt }) })
      toast.error('Case rejected on-chain', {
        description: `FinancingPool case #${c.financingCaseId} — ${txHash}`,
        action: { label: 'View on Explorer', onClick: () => window.open(explorerTxUrl(txHash), '_blank') },
      })
    } catch (error) {
      console.error('[rejectCase] failed:', error)
      toast.error('Rejection failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setBusy(false)
    }
  }

  const handleDisburse = async () => {
    if (!walletClient || c.financingCaseId == null) return
    setBusy(true)
    try {
      const { txHash } = await disburse(walletClient, BigInt(c.financingCaseId))
      const disbursedAt = new Date().toISOString()
      onUpdated({ disbursedTxHash: txHash, disbursedAt })
      await fetch(`/api/mock/cases/${c.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ disbursedTxHash: txHash, disbursedAt }) })
      if (c.exporterWallet) {
        fetch('/api/travel-rule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseNumber: c.id, eventType: 'disbursement', amount: c.amount, txHash,
            customerRole: 'exporter', customerWallet: c.exporterWallet, customerName: c.companyName,
          }),
        })
          .catch((error) => console.error('[travel-rule] disbursement record failed:', error))
          .finally(() => onTravelRuleChange?.())
      }
      toastTxSuccess('Funds disbursed', txHash, `Advance sent to the exporter for case #${c.financingCaseId}`)
      await load()
    } catch (error) {
      console.error('[disburse] failed:', error)
      toast.error('Disbursement failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setBusy(false)
    }
  }

  // AML gate: Approve is blocked while either wallet's screening is still
  // loading or has actually returned a risk flag. A technical "unavailable"
  // result does NOT block — see docs/changes/20260807_GoPlus錢包風險篩查.md
  const amlBlocked = onChainStatus === CASE_STATUS.PENDING_APPROVAL && (
    !exporterSecurity || !buyerSecurity || exporterSecurity.flagged || buyerSecurity.flagged
  )

  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
      <h2 className="text-title-lg font-bold mb-4">Review Actions</h2>
      {onChainStatus === CASE_STATUS.PENDING_APPROVAL && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <WalletSecurityCheck address={c.exporterWallet} label="Exporter Wallet" onResult={setExporterSecurity} />
          <WalletSecurityCheck address={c.buyerWallet} label="Buyer Wallet" onResult={setBuyerSecurity} />
        </div>
      )}
      {onChainStatus === CASE_STATUS.PENDING_APPROVAL && (
        <div className="flex gap-3">
          <Button onClick={handleApprove} disabled={busy || amlBlocked} className="flex-1 h-11"><CheckCircle2 size={18} className="mr-1.5" /> Approve Application</Button>
          <Button variant="outline" onClick={handleReject} disabled={busy} className="flex-1 h-11"><XCircle size={18} className="mr-1.5" /> Reject Application</Button>
        </div>
      )}
      {onChainStatus === CASE_STATUS.APPROVED && (
        <Button onClick={handleDisburse} disabled={busy} className="w-full h-11"><Banknote size={18} className="mr-1.5" /> {busy ? 'Disbursing…' : 'Disburse Funds'}</Button>
      )}
      {onChainStatus === CASE_STATUS.DISBURSED && <p className="text-body-md text-risk-low font-semibold">Funds disbursed — awaiting buyer repayment.</p>}
      {onChainStatus === CASE_STATUS.REPAID && <p className="text-body-md text-risk-low font-semibold">Case settled — repaid in full.</p>}
      {onChainStatus === CASE_STATUS.REJECTED && <p className="text-body-md text-error font-semibold">Case rejected.</p>}
    </div>
  )
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [c, setC] = useState<FinanceCase | null>(null)
  const [travelRuleRefreshKey, setTravelRuleRefreshKey] = useState(0)
  const [stage, setStage] = useState<CaseStage | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/mock/cases/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return }
        setC(data)
        setStage(data.stage)
      })
      .catch(() => setNotFound(true))
  }, [id])

  const updateStage = async (newStage: CaseStage) => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/mock/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStage(newStage)
      if (newStage === 'approved') toast.success('Case Approved', { description: `${c?.companyName}'s financing application has been approved` })
      if (newStage === 'rejected') toast.error('Case Rejected', { description: `${c?.companyName}'s financing application has been rejected` })
    } catch (err) {
      toast.error('Action Failed', { description: err instanceof Error ? err.message : 'Please try again later' })
    } finally {
      setActionLoading(false)
    }
  }

  if (notFound) return (
    <PageLayout title="Case Details">
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
        <p className="text-body-md text-ink-faint">Case {id} not found</p>
      </div>
    </PageLayout>
  )

  if (!c) return (
    <PageLayout title="Case Details">
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    </PageLayout>
  )

  const currentStage = stage ?? c.stage
  const canAction = ACTIONABLE_STAGES.includes(currentStage)
  const financeTypeLabel = { receivables: 'Receivables', supply_chain: 'Supply Chain Financing', trade: 'Trade Finance' }[c.financeType]

  return (
    <PageLayout
      title={c.companyName}
      subtitle={c.id}
      actions={<a href="/bank/cases" className="text-body-md text-primary hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Back to List</a>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
            <Tabs defaultValue="info">
              <TabsList className="mx-6 mt-4">
                <TabsTrigger value="info">Case Information</TabsTrigger>
                {isRealContractMode && <TabsTrigger value="onchain">On-Chain Activity</TabsTrigger>}
                <TabsTrigger value="assessment">AI Case Assessment</TabsTrigger>
                <TabsTrigger value="news">News Scan</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="p-6 pt-4">
                <div className="flex justify-end mb-4">
                  <span className="px-2 py-1 bg-primary/10 text-primary text-label-md font-bold rounded-md uppercase font-mono">{financeTypeLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <InfoField label="Financing Amount" value={<span className="text-primary font-bold">{formatUSD(c.amount)}</span>} />
                  <InfoField label="Review Stage" value={
                    <span className={`px-2 py-0.5 rounded-full text-label-md font-medium ${STAGE_TONE[currentStage]}`}>{STAGE_LABEL[currentStage]}</span>
                  } />
                  {c.buyerName && <InfoField label="Buyer Company" value={c.buyerName} />}
                  {c.invoiceNumber && <InfoField label="Invoice Number" value={c.invoiceNumber} />}
                  {c.dueDate && <InfoField label="Due Date" value={formatDateOnly(c.dueDate)} />}
                  {c.industry && <InfoField label="Industry" value={c.industry} />}
                  {c.exporterCountry && <InfoField label="Exporter Country" value={c.exporterCountry} />}
                  {c.buyerCountry && <InfoField label="Buyer Country" value={c.buyerCountry} />}
                  <InfoField label="Buyer Concentration" value={
                    <span className={c.buyerConcentration > 70 ? 'text-error font-bold' : ''}>{c.buyerConcentration}%</span>
                  } />
                  <InfoField label="Created At" value={formatDate(c.createdAt)} />
                  <InfoField label="Last Updated" value={formatDate(c.updatedAt)} />
                  {c.invoiceTokenId != null && <InfoField label="Invoice Token ID" value={`#${c.invoiceTokenId}`} />}
                  {c.financingCaseId != null && <InfoField label="Financing Case ID" value={`#${c.financingCaseId}`} />}
                  {c.chainTxHash && <HashField label="Mint Tx Hash" value={c.chainTxHash} href={explorerTxUrl(c.chainTxHash)} />}
                  {c.invoiceHash && <HashField label="Invoice Hash" value={c.invoiceHash} />}
                  {c.exporterWallet && <HashField label="Exporter Wallet" value={c.exporterWallet} href={explorerAddressUrl(c.exporterWallet)} />}
                  {c.buyerWallet && <HashField label="Buyer Wallet" value={c.buyerWallet} href={explorerAddressUrl(c.buyerWallet)} />}
                </div>
              </TabsContent>

              {isRealContractMode && (
                <TabsContent value="onchain" className="p-6 pt-4">
                  <CaseActivityTimeline c={c} bare />
                </TabsContent>
              )}
              <TabsContent value="assessment" className="p-6 pt-4">
                <AiAssessmentPanel caseNumber={c.id} caseData={c} />
              </TabsContent>
              <TabsContent value="news" className="p-6 pt-4">
                <NewsScanPanel caseNumber={c.id} />
              </TabsContent>
            </Tabs>
          </div>

          {isRealContractMode ? (
            <RealModeActions c={c} onUpdated={(patch) => setC(prev => prev ? { ...prev, ...patch } : prev)} onTravelRuleChange={() => setTravelRuleRefreshKey(k => k + 1)} />
          ) : canAction && (
            <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
              <h2 className="text-title-lg font-bold mb-4">Review Actions</h2>
              <div className="flex gap-3">
                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={actionLoading}
                    className="flex-1 py-3.5 rounded-lg bg-primary text-white text-body-md font-bold hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Approve Application
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm approval of this case?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to approve <strong>{c.companyName}</strong>&apos;s financing application ({formatUSD(c.amount)}). This action will notify the applicant.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-primary hover:opacity-90" onClick={() => updateStage('approved')}>Confirm Approval</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger
                    disabled={actionLoading}
                    className="flex-1 py-3.5 rounded-lg border border-outline text-on-surface text-body-md font-bold hover:bg-surface-container-low disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Reject Application
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm rejection of this case?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You are about to reject <strong>{c.companyName}</strong>&apos;s financing application. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-error hover:opacity-90" onClick={() => updateStage('rejected')}>Confirm Rejection</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}

          {isRealContractMode && <TravelRulePanel caseNumber={c.id} refreshKey={travelRuleRefreshKey} />}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 text-center">
            <h2 className="text-title-lg font-bold mb-4 text-left">Risk Score</h2>
            <p className="text-display-lg font-bold" style={{ color: getRiskColor(c.riskLevel) }}>{c.riskScore}</p>
            <p className="text-label-md text-ink-faint mt-1">/ 100 pts</p>
            <span className="inline-block mt-3 text-label-md font-medium px-3 py-1 rounded-full" style={{ color: getRiskColor(c.riskLevel), background: getRiskBg(c.riskLevel) }}>
              {RISK_LABEL[c.riskLevel]}
            </span>
          </div>
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={18} className="text-primary" />
              <h2 className="text-title-lg font-bold">CVA Status</h2>
            </div>
            <p className="text-body-md text-on-surface-variant">This invoice&apos;s asset hash is registered on-chain and cannot be financed twice.</p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
