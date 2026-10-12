'use client'
import { useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Link2, AlertTriangle, CheckCircle2 } from 'lucide-react'

const isRealMode = process.env.NEXT_PUBLIC_CONTRACT_MODE === 'real'

export default function AdminContractsPage() {
  const [hash, setHash] = useState('')
  const [result, setResult] = useState<{ exists: boolean; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const verify = async () => {
    setLoading(true)
    const res = await fetch('/api/contracts/verify-hash', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash }),
    })
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <PageLayout title="Contract Management" subtitle="Smart contract interaction">
      <div className="max-w-lg space-y-4">
        <div className="bg-primary-fixed/30 rounded-xl border border-primary-fixed-dim p-4 flex items-center gap-2">
          <Link2 size={16} className="text-primary shrink-0" />
          <div>
            <p className="text-body-md font-semibold text-primary mb-0.5">Contract Mode</p>
            <p className="text-body-md text-primary">{isRealMode ? 'Monad Testnet Live Mode' : 'Mock Mode (no MetaMask required)'}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
          <h2 className="text-title-lg font-bold text-on-surface mb-1">Invoice Hash Duplicate Check</h2>
          <p className="text-body-md text-on-surface-variant mb-4">
            {isRealMode
              ? 'Reads InvoiceAsset.isHashDuplicate() directly on Monad Testnet.'
              : 'Simulated — switch NEXT_PUBLIC_CONTRACT_MODE=real to query the deployed contract.'}
          </p>
          <div className="flex gap-2">
            <Input placeholder="0x… (bytes32 invoice hash)" value={hash} onChange={e => setHash(e.target.value)} className="h-11 font-mono bg-surface-container-low border-border-subtle flex-1" />
            <Button onClick={verify} disabled={!hash || loading} className="h-11 shrink-0">{loading ? 'Checking…' : 'Check'}</Button>
          </div>
          {result?.error && (
            <div className="mt-4 rounded-lg p-4 text-body-md flex items-start gap-2 bg-error-container/40 text-error">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}
          {result && !result.error && (
            <div className={`mt-4 rounded-lg p-4 text-body-md flex items-start gap-2 ${result.exists ? 'bg-error-container/40 text-error' : 'bg-risk-low/10 text-risk-low'}`}>
              {result.exists ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
              <span>{result.exists ? 'Hash already exists on-chain (duplicate financing risk)' : 'Hash not found on-chain — available for financing'}</span>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
