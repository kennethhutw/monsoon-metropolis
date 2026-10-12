// Shared "transaction succeeded" toast — always shows the tx hash and a
// button to open it on Monad Explorer, so real-mode actions can be verified.

'use client'
import { toast } from 'sonner'
import { explorerTxUrl } from '@/lib/contracts/config'

export function toastTxSuccess(title: string, txHash: string, description?: string) {
  toast.success(title, {
    description: description ? `${description} — ${txHash}` : txHash,
    action: {
      label: 'View on Explorer',
      onClick: () => window.open(explorerTxUrl(txHash), '_blank'),
    },
  })
}
