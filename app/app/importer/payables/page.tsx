'use client'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'
import { publicClient, contractAddresses } from '@/lib/contracts/config'
import { invoiceAssetAbi } from '@/lib/contracts/abis/invoiceAsset'
import { financingPoolAbi } from '@/lib/contracts/abis/financingPool'
import { confirmReceivable, approveStablecoin, getStablecoinAllowance, repay } from '@/lib/contracts/walletActions'
import { toastTxSuccess } from '@/lib/toastTx'
import { CvaEligibilityHint } from '@/components/shared/CvaEligibilityHint'
import { formatUSD, formatDate } from '@/lib/utils'
import { explorerTxUrl } from '@/lib/contracts/config'
import { FinanceCase } from '@/types/case'
import { CheckCircle2, FileCheck } from 'lucide-react'

const CASE_STATUS_DISBURSED = 2

function RealModeSection() {
  const { address, isConnected, isWrongNetwork, walletClient } = useWallet()
  const [pending, setPending] = useState<FinanceCase[]>([])
  const [repayable, setRepayable] = useState<{ c: FinanceCase; repaymentAmount: bigint }[]>([])
  const [confirmedHistory, setConfirmedHistory] = useState<FinanceCase[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!address) return
    setLoading(true)
    try {
      const res = await fetch(`/api/mock/cases?buyerWallet=${address}`)
      const json = await res.json()
      if (!Array.isArray(json)) {
        console.error('[importer/payables] expected an array of cases, got:', json)
        return
      }
      const cases = json as FinanceCase[]

      const pendingConfirm: FinanceCase[] = []
      const disbursed: { c: FinanceCase; repaymentAmount: bigint }[] = []
      const confirmed = cases.filter((c) => c.buyerConfirmedAt)

      for (const c of cases) {
        if (c.invoiceTokenId == null) continue
        if (c.stage === 'submitted') {
          const isConfirmedOnChain = await publicClient.readContract({
            address: contractAddresses.invoiceAsset,
            abi: invoiceAssetAbi,
            functionName: 'isBuyerConfirmed',
            args: [BigInt(c.invoiceTokenId)],
          })
          if (!isConfirmedOnChain) pendingConfirm.push(c)
        } else if (c.financingCaseId != null) {
          const financingCase = await publicClient.readContract({
            address: contractAddresses.financingPool,
            abi: financingPoolAbi,
            functionName: 'getCase',
            args: [BigInt(c.financingCaseId)],
          })
          if (financingCase.status === CASE_STATUS_DISBURSED) {
            disbursed.push({ c, repaymentAmount: financingCase.repaymentAmount })
          }
        }
      }
      setPending(pendingConfirm)
      setRepayable(disbursed)
      setConfirmedHistory(confirmed)
    } catch (error) {
      console.error('[importer/payables] on-chain read failed:', error)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => { load() }, [load])

  const handleConfirm = async (c: FinanceCase) => {
    if (!walletClient || c.invoiceTokenId == null) return
    setBusyId(c.id)
    try {
      const { txHash } = await confirmReceivable(walletClient, BigInt(c.invoiceTokenId))
      await fetch(`/api/mock/cases/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerConfirmedAt: new Date().toISOString(), buyerConfirmedTxHash: txHash }),
      })
      toastTxSuccess('Receivable confirmed', txHash, `${c.id} — the exporter can now submit it for financing`)
      await load()
    } catch (error) {
      console.error('[confirmReceivable] failed:', error)
      toast.error('Confirmation failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setBusyId(null)
    }
  }

  const handleRepay = async (c: FinanceCase, repaymentAmount: bigint) => {
    if (!walletClient || !address || c.financingCaseId == null) return
    setBusyId(c.id)
    try {
      const allowance = await getStablecoinAllowance(address)
      if (allowance < repaymentAmount) {
        await approveStablecoin(walletClient, repaymentAmount)
      }
      const { txHash } = await repay(walletClient, BigInt(c.financingCaseId))
      await fetch(`/api/mock/cases/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repaidTxHash: txHash, repaidAt: new Date().toISOString() }),
      })
      fetch('/api/travel-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseNumber: c.id, eventType: 'repayment', amount: c.amount, txHash,
          customerRole: 'buyer', customerWallet: address, customerName: c.buyerName,
        }),
      }).catch((error) => console.error('[travel-rule] repayment record failed:', error))
      toastTxSuccess('Repayment complete', txHash, `${c.id} settled — invoice NFT released back to the exporter`)
      await load()
    } catch (error) {
      console.error('[repay] failed:', error)
      toast.error('Repayment failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setBusyId(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-8 text-center mb-6">
        <p className="text-body-md text-on-surface-variant mb-4">Connect your wallet to see receivables awaiting confirmation and repayment.</p>
        <div className="flex justify-center"><ConnectWalletButton /></div>
      </div>
    )
  }
  if (isWrongNetwork) return null
  if (loading) return <div className="mb-6"><Skeleton className="h-20 rounded-xl" /></div>

  const eligibilityHint = isRealContractMode ? <CvaEligibilityHint address={address} kybHref="/importer/kyb" /> : null
  if (pending.length === 0 && repayable.length === 0 && confirmedHistory.length === 0) return <div className="mb-6">{eligibilityHint}</div>

  return (
    <div className="space-y-6 mb-6">
      {eligibilityHint}
      {pending.length > 0 && (
        <div>
          <h2 className="text-title-md font-bold text-on-surface mb-3">Pending Confirmation</h2>
          <div className="space-y-3">
            {pending.map(c => (
              <div key={c.id} className="rounded-xl border border-risk-medium/30 bg-risk-medium/5 shadow-card p-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileCheck size={20} className="text-risk-medium shrink-0" />
                  <div>
                    <p className="text-body-md font-semibold text-ink">{c.companyName} — {c.id}</p>
                    <p className="text-label-md text-ink-faint mt-0.5">Invoice NFT #{c.invoiceTokenId} • {formatUSD(c.amount)}</p>
                  </div>
                </div>
                <Button onClick={() => handleConfirm(c)} disabled={busyId === c.id} className="shrink-0">
                  {busyId === c.id ? 'Confirming…' : 'Confirm Receivable'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {repayable.length > 0 && (
        <div>
          <h2 className="text-title-md font-bold text-on-surface mb-3">Ready to Repay</h2>
          <div className="space-y-3">
            {repayable.map(({ c, repaymentAmount }) => (
              <div key={c.id} className="rounded-xl border border-primary-container bg-primary-fixed/20 shadow-card p-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-body-md font-semibold text-ink">{c.companyName} — {c.id}</p>
                  <p className="text-label-md text-ink-faint mt-0.5 font-mono">Repayment due: {(Number(repaymentAmount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} mUSDC</p>
                </div>
                <Button onClick={() => handleRepay(c, repaymentAmount)} disabled={busyId === c.id} className="shrink-0">
                  {busyId === c.id ? 'Repaying…' : 'Repay'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      {confirmedHistory.length > 0 && (
        <div>
          <h2 className="text-title-md font-bold text-on-surface mb-3">Confirmed by You</h2>
          <div className="space-y-3">
            {confirmedHistory.map(c => (
              <div key={c.id} className="rounded-xl border border-risk-low/30 bg-risk-low/5 shadow-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-risk-low shrink-0" />
                    <div>
                      <p className="text-body-md font-semibold text-ink">{c.companyName} — {c.id}</p>
                      <p className="text-label-md text-ink-faint mt-0.5">Confirmed {c.buyerConfirmedAt && new Date(c.buyerConfirmedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-body-md font-bold text-ink font-mono shrink-0">{formatUSD(c.amount)}</p>
                </div>
                {c.buyerConfirmedTxHash && (
                  <a href={explorerTxUrl(c.buyerConfirmedTxHash)} target="_blank" rel="noopener noreferrer" className="text-label-md text-primary hover:underline font-mono break-all block mt-2 pl-8">
                    {c.buyerConfirmedTxHash}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ImporterPayablesPage() {
  const [cases, setCases] = useState<FinanceCase[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [paid, setPaid] = useState<Set<string>>(new Set())
  const [payingId, setPayingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mock/cases?stage=approved')
      .then(r => r.json())
      .then(setCases)
      .finally(() => setLoading(false))
  }, [])

  const confirmPayment = async (caseId: string, companyName: string, amount: number) => {
    setPayingId(caseId)
    // TODO（Supabase）: INSERT INTO payments ...
    await new Promise(r => setTimeout(r, 600))  // simulated network delay
    setPaid(prev => new Set([...prev, caseId]))
    setPayingId(null)
    toast.success('Payment Confirmed', {
      description: `Confirmed payment of ${formatUSD(amount)} to ${companyName}`,
    })
  }

  return (
    <PageLayout title="Payables" subtitle="Post-financing payable management">
      {isRealContractMode && <RealModeSection />}
      <DataWrapper data={cases} loading={loading} error={null}
        empty={<EmptyState icon="📋" title="No payables at this time" />}
        skeleton={<div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>}
      >
        {data => (
          <div className="space-y-3">
            {data.map(c => {
              const isPaid = paid.has(c.id)
              return (
                <div key={c.id} className={`rounded-xl border shadow-card p-5 transition-colors ${isPaid ? 'border-risk-low/30 bg-risk-low/5' : 'border-border-subtle bg-surface'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-semibold text-ink">{c.companyName}</p>
                      <p className="text-label-md text-ink-faint mt-0.5">Due: {formatDate(c.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-body-md font-bold text-ink font-mono">{formatUSD(c.amount)}</p>
                        <span className={`text-label-md px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${isPaid ? 'bg-risk-low/15 text-risk-low' : 'bg-primary-fixed text-primary'}`}>
                          {isPaid && <CheckCircle2 size={12} />}{isPaid ? 'Paid' : 'Approved'}
                        </span>
                      </div>
                      {!isPaid && (
                        <AlertDialog>
                          <AlertDialogTrigger
                            disabled={payingId === c.id}
                            className="text-body-md px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-40 whitespace-nowrap font-semibold"
                          >
                            {payingId === c.id ? 'Processing...' : 'Confirm Payment'}
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm payment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                You are about to confirm payment of <strong>{formatUSD(c.amount)}</strong> to <strong>{c.companyName}</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-primary hover:opacity-90"
                                onClick={() => confirmPayment(c.id, c.companyName, c.amount)}
                              >
                                Confirm Payment
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DataWrapper>
    </PageLayout>
  )
}
