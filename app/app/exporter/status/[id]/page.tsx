'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { Button } from '@/components/ui/button'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import { CaseActivityTimeline } from '@/components/shared/CaseActivityTimeline'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'
import { publicClient, contractAddresses } from '@/lib/contracts/config'
import { invoiceAssetAbi } from '@/lib/contracts/abis/invoiceAsset'
import { approveInvoiceTransfer, submitCase } from '@/lib/contracts/walletActions'
import { toastTxSuccess } from '@/lib/toastTx'
import { formatUSD, formatDateOnly } from '@/lib/utils'
import { FinanceCase, CaseStage } from '@/types/case'
import { Check, XCircle, ArrowLeft, Send } from 'lucide-react'

const STAGES: CaseStage[] = ['submitted', 'ai_review', 'credit_committee', 'approved']
const STAGE_LABEL: Record<CaseStage, string> = {
  submitted: 'Submitted', ai_review: 'AI Review', credit_committee: 'Credit Committee', approved: 'Approved', rejected: 'Rejected'
}

export default function ExporterStatusPage() {
  const { id } = useParams<{ id: string }>()
  const [c, setC] = useState<FinanceCase | null>(null)
  const { isConnected, isWrongNetwork, walletClient } = useWallet()
  const [buyerConfirmed, setBuyerConfirmed] = useState<boolean | null>(null)
  const [submittingCase, setSubmittingCase] = useState(false)

  useEffect(() => {
    fetch(`/api/mock/cases/${id}`)
      .then(r => r.json())
      .then(data => setC(data.error ? null : data))
      .catch(() => setC(null))
  }, [id])

  useEffect(() => {
    if (!isRealContractMode || !c?.invoiceTokenId || c.stage !== 'submitted') {
      setBuyerConfirmed(null)
      return
    }
    publicClient
      .readContract({
        address: contractAddresses.invoiceAsset,
        abi: invoiceAssetAbi,
        functionName: 'isBuyerConfirmed',
        args: [BigInt(c.invoiceTokenId)],
      })
      .then((confirmed) => setBuyerConfirmed(confirmed))
      .catch((error) => {
        console.error('[isBuyerConfirmed] read failed:', error)
        setBuyerConfirmed(null)
      })
  }, [c])

  const handleSubmitForFinancing = async () => {
    if (!c?.invoiceTokenId || !walletClient) return
    setSubmittingCase(true)
    try {
      const tokenId = BigInt(c.invoiceTokenId)
      const { txHash: approveTxHash } = await approveInvoiceTransfer(walletClient, tokenId)
      toastTxSuccess('Invoice transfer approved', approveTxHash)
      const { txHash, caseId } = await submitCase(walletClient, tokenId)
      const submittedAt = new Date().toISOString()
      const res = await fetch(`/api/mock/cases/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'ai_review', financingCaseId: Number(caseId), submittedTxHash: txHash, submittedAt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setC(data)
      toastTxSuccess('Submitted for financing', txHash, `FinancingPool case #${caseId}`)
    } catch (error) {
      console.error('[submitForFinancing] failed:', error)
      toast.error('Failed to submit for financing', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setSubmittingCase(false)
    }
  }

  if (!c) return <PageLayout title="Application Status"><p className="text-body-md text-ink-faint">Application {id} not found</p></PageLayout>

  const isRejected = c.stage === 'rejected'
  const stageIdx = isRejected ? -1 : STAGES.indexOf(c.stage)
  const showSubmitAction = isRealContractMode && c.invoiceTokenId != null && c.stage === 'submitted'

  return (
    <PageLayout title="Application Status" subtitle={c.id} actions={<a href="/exporter/applications" className="text-body-md text-primary hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Back to List</a>}>
      <div className="max-w-lg space-y-6">
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 flex items-center justify-between">
          <div>
            <p className="text-body-md text-on-surface-variant mb-1">Financing Amount</p>
            <p className="text-headline-lg font-bold text-primary font-mono">{formatUSD(c.amount)}</p>
          </div>
          {isRejected && (
            <span className="text-label-md font-medium px-3 py-1 rounded-full bg-error-container/40 text-error">Rejected</span>
          )}
          {c.stage === 'approved' && (
            <span className="text-label-md font-medium px-3 py-1 rounded-full bg-risk-low/15 text-risk-low">Approved</span>
          )}
        </div>

        {(c.buyerName || c.invoiceNumber || c.dueDate) && (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 grid grid-cols-2 gap-4">
            {c.buyerName && (
              <div>
                <label className="text-label-md uppercase text-outline block mb-1 font-mono">Buyer Company</label>
                <p className="text-body-md font-medium text-ink">{c.buyerName}</p>
              </div>
            )}
            {c.invoiceNumber && (
              <div>
                <label className="text-label-md uppercase text-outline block mb-1 font-mono">Invoice Number</label>
                <p className="text-body-md font-medium text-ink">{c.invoiceNumber}</p>
              </div>
            )}
            {c.dueDate && (
              <div>
                <label className="text-label-md uppercase text-outline block mb-1 font-mono">Due Date</label>
                <p className="text-body-md font-medium text-ink">{formatDateOnly(c.dueDate)}</p>
              </div>
            )}
          </div>
        )}

        {isRealContractMode && <CaseActivityTimeline c={c} />}

        {showSubmitAction && (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <h2 className="text-title-lg font-bold text-on-surface mb-2">Submit for Financing</h2>
            {buyerConfirmed === null && (
              <p className="text-body-md text-on-surface-variant">Checking whether the buyer has confirmed the receivable on-chain…</p>
            )}
            {buyerConfirmed === false && (
              <p className="text-body-md text-on-surface-variant">Waiting for the buyer to confirm this receivable (invoice NFT #{c.invoiceTokenId}) before it can be submitted for financing.</p>
            )}
            {buyerConfirmed === true && !isConnected && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-body-md text-on-surface-variant">Buyer confirmed — connect your wallet to submit.</p>
                <ConnectWalletButton />
              </div>
            )}
            {buyerConfirmed === true && isConnected && isWrongNetwork && (
              <p className="text-body-md text-risk-medium">Switch to Monad Testnet to continue.</p>
            )}
            {buyerConfirmed === true && isConnected && !isWrongNetwork && (
              <Button onClick={handleSubmitForFinancing} disabled={submittingCase} className="w-full h-11">
                <Send size={16} className="mr-1.5" />
                {submittingCase ? 'Submitting…' : 'Submit for Financing'}
              </Button>
            )}
          </div>
        )}

        {isRejected ? (
          <div className="bg-error-container/30 rounded-xl border border-error/20 p-6">
            <div className="flex items-center gap-3">
              <XCircle size={28} className="text-error shrink-0" />
              <div>
                <p className="text-body-lg font-semibold text-error">Application Rejected</p>
                <p className="text-body-md text-error/80 mt-0.5">Please contact the bank for details, or resubmit your application</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <h2 className="text-title-lg font-bold text-on-surface mb-5">Review Progress</h2>
            <div className="relative pl-5">
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-border-subtle" />
              {STAGES.map((s, i) => (
                <div key={s} className="flex items-center gap-4 pb-6 last:pb-0 relative">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${
                    i < stageIdx ? 'bg-primary border-primary' :
                    i === stageIdx ? 'bg-surface border-primary' : 'bg-surface border-border-subtle'
                  }`}>
                    {i < stageIdx
                      ? <Check size={14} className="text-white" />
                      : <div className={`w-2 h-2 rounded-full ${i === stageIdx ? 'bg-primary' : 'bg-border-subtle'}`} />}
                  </div>
                  <span className={`text-body-md ${i <= stageIdx ? 'font-semibold text-ink' : 'text-ink-faint'}`}>
                    {STAGE_LABEL[s]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
