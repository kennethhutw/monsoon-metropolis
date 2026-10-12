'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { keccak256, toHex, parseUnits } from 'viem'
import { PageLayout } from '@/components/shared/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import { useRole } from '@/hooks/useRole'
import { useWallet, isRealContractMode } from '@/hooks/useWallet'
import { mintInvoice } from '@/lib/contracts/walletActions'
import { explorerTxUrl } from '@/lib/contracts/config'
import { toastTxSuccess } from '@/lib/toastTx'
import { CvaEligibilityHint } from '@/components/shared/CvaEligibilityHint'
import { CheckCircle2, Link2, Wallet, AlertTriangle, ExternalLink } from 'lucide-react'

export default function ExporterApplyPage() {
  const { user } = useRole()
  const { address, isConnected, isWrongNetwork, walletClient } = useWallet()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState<string | null>(null)
  const [submittedCaseId, setSubmittedCaseId] = useState<string | null>(null)
  const [mintTxHash, setMintTxHash] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [financeType, setFinanceType] = useState('receivables')
  const [buyerName, setBuyerName] = useState('')
  const [buyerWallet, setBuyerWallet] = useState('')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [industry, setIndustry] = useState('')
  const [buyerCountry, setBuyerCountry] = useState('')
  const [exporterCountry, setExporterCountry] = useState('')

  const canSubmit = isRealContractMode
    ? buyerName && buyerWallet && isConnected && !isWrongNetwork
    : buyerName

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const companyName = user?.organization ?? 'Unknown Exporter'
      let onChainFields: {
        invoiceHash: string
        invoiceTokenId: number
        exporterWallet: string
        buyerWallet: string
        chainTxHash: string
      } | null = null

      if (isRealContractMode) {
        if (!walletClient || !address) throw new Error('Connect your wallet first')
        setSubmitStage('Minting invoice NFT — confirm in your wallet…')

        const invoiceHash = keccak256(toHex(`${buyerName}:${invoiceNo ?? ''}:${amount}`))
        const dueDateTimestamp = BigInt(Math.floor(new Date(dueDate).getTime() / 1000))

        const { txHash, tokenId } = await mintInvoice(walletClient, {
          invoiceHash,
          amount: parseUnits(amount, 6),
          dueDate: dueDateTimestamp,
          buyerWallet: buyerWallet as `0x${string}`,
          cvaTokenId: '',
          metadataURI: `${window.location.origin}/api/nft-metadata/${invoiceHash}`,
        })

        onChainFields = {
          invoiceHash,
          invoiceTokenId: Number(tokenId),
          exporterWallet: address,
          buyerWallet,
          chainTxHash: txHash,
        }
        setMintTxHash(txHash)
        toastTxSuccess('Invoice NFT minted', txHash, `Token #${tokenId}`)
      }

      setSubmitStage('Saving application…')
      const res = await fetch('/api/mock/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          financeType,
          amount: Number(amount),
          buyerName,
          invoiceNo,
          dueDate,
          industry: industry || undefined,
          buyerCountry: buyerCountry || undefined,
          exporterCountry: exporterCountry || undefined,
          ...onChainFields,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Submission failed')
      setSubmittedCaseId(data.id)
    } catch (error) {
      console.error('[apply] submission failed:', error)
      toast.error('Failed to submit application', {
        description: error instanceof Error ? error.message : 'Please try again',
      })
    } finally {
      setSubmitting(false)
      setSubmitStage(null)
    }
  }

  if (submittedCaseId) return (
    <PageLayout title="Apply for Financing">
      <div className="max-w-md mx-auto bg-surface rounded-2xl border border-border-subtle shadow-card p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-risk-low/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-risk-low" />
        </div>
        <h2 className="text-headline-md font-bold text-on-surface mb-2">Application Submitted</h2>
        <p className="text-body-md text-on-surface-variant mb-1">Case number <span className="font-mono font-semibold text-ink">{submittedCaseId}</span></p>
        <p className="text-body-md text-on-surface-variant mb-6">
          {isRealContractMode
            ? 'The invoice NFT has been minted on Monad Testnet. Once the buyer confirms the receivable, you can submit it for financing.'
            : 'AI pre-screening is typically completed within 30 minutes.'}
        </p>
        {mintTxHash && (
          <a
            href={explorerTxUrl(mintTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex items-center justify-between gap-2 bg-surface-container-low border border-border-subtle rounded-lg px-3 py-2.5 hover:border-primary-container transition-colors group"
          >
            <code className="text-code-sm text-on-surface font-mono flex-1 text-left truncate">{mintTxHash}</code>
            <ExternalLink size={14} className="text-outline group-hover:text-primary shrink-0" />
          </a>
        )}
        <div className="flex gap-3 justify-center">
          <a href={`/exporter/status/${submittedCaseId}`}><Button>View Status</Button></a>
          <Button variant="outline" onClick={() => { setSubmittedCaseId(null); setMintTxHash(null); setStep(1); setAmount(''); setBuyerName(''); setBuyerWallet(''); setInvoiceNo(''); setIndustry(''); setBuyerCountry(''); setExporterCountry('') }}>Apply Again</Button>
        </div>
      </div>
    </PageLayout>
  )

  return (
    <PageLayout title="Apply for Financing" subtitle="Submit a new financing application">
      <div className="max-w-lg mx-auto">
        <div className="bg-surface rounded-2xl border border-border-subtle shadow-card p-8 space-y-5">
          {step === 1 && (
            <>
              <h2 className="text-title-lg font-bold text-on-surface">Basic Information</h2>
              <div>
                <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Financing Type</label>
                <select value={financeType} onChange={e => setFinanceType(e.target.value)} className="w-full h-11 text-body-md border border-border-subtle rounded-lg px-3 bg-surface">
                  <option value="receivables">Receivables Financing</option>
                  <option value="supply_chain">Supply Chain Financing</option>
                  <option value="trade">Trade Finance</option>
                </select>
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Application Amount (USD)</label>
                <Input type="number" placeholder="e.g. 10000000" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 bg-surface-container-low border-border-subtle" />
              </div>
              <Button className="w-full h-11" disabled={!amount} onClick={() => setStep(2)}>Next</Button>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-title-lg font-bold text-on-surface">Buyer & Document Information</h2>
              {isRealContractMode && <CvaEligibilityHint address={address} kybHref="/exporter/kyb" />}
              <div>
                <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Buyer Company Name</label>
                <Input placeholder="e.g. Atlas Industrial Buyers Inc." value={buyerName} onChange={e => setBuyerName(e.target.value)} className="h-11 bg-surface-container-low border-border-subtle" />
              </div>
              {isRealContractMode && (
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Buyer Wallet Address</label>
                  <Input placeholder="0x… (must hold a CVI-verified Buyer role)" value={buyerWallet} onChange={e => setBuyerWallet(e.target.value)} className="h-11 font-mono bg-surface-container-low border-border-subtle" />
                </div>
              )}
              <div>
                <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Invoice Number</label>
                <Input placeholder="e.g. INV-2024-001" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} className="h-11 bg-surface-container-low border-border-subtle" />
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Due Date</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11 bg-surface-container-low border-border-subtle" />
              </div>
              <div>
                <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Industry</label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full h-11 text-body-md border border-border-subtle rounded-lg px-3 bg-surface">
                  <option value="">Select industry (optional)</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Textiles">Textiles</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Exporter Country</label>
                  <Input placeholder="e.g. Vietnam" value={exporterCountry} onChange={e => setExporterCountry(e.target.value)} className="h-11 bg-surface-container-low border-border-subtle" />
                </div>
                <div>
                  <label className="text-label-md text-on-surface-variant mb-1.5 block font-mono">Buyer Country</label>
                  <Input placeholder="e.g. United States" value={buyerCountry} onChange={e => setBuyerCountry(e.target.value)} className="h-11 bg-surface-container-low border-border-subtle" />
                </div>
              </div>
              <div className="bg-primary-fixed/30 rounded-lg p-3 flex items-center gap-2">
                <Link2 size={16} className="text-primary shrink-0" />
                <p className="text-body-md text-primary">
                  {isRealContractMode
                    ? 'Submitting will mint this invoice as an on-chain NFT — the hash is registered atomically so it can never be financed twice.'
                    : 'The invoice hash will be automatically verified on-chain after submission'}
                </p>
              </div>

              {isRealContractMode && !isConnected && (
                <div className="rounded-lg border border-border-subtle bg-surface-container-low p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
                    <Wallet size={16} className="shrink-0" /> Connect your wallet to mint the invoice
                  </div>
                  <ConnectWalletButton />
                </div>
              )}
              {isRealContractMode && isConnected && isWrongNetwork && (
                <div className="rounded-lg border border-risk-medium/30 bg-risk-medium/10 p-4 flex items-center gap-2 text-body-md text-risk-medium">
                  <AlertTriangle size={16} className="shrink-0" /> Switch to Monad Testnet to continue
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1 h-11" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                  {submitting ? (submitStage ?? 'Submitting…') : 'Submit Application'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
