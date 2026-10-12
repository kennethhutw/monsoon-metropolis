'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'

// Lightweight banner — checks CVA eligibility for the connected wallet and,
// if not eligible, points to the role's Verification page instead of
// duplicating the full check+apply UI. See docs/changes/20260806_CVA資格檢查與申請.md
export function CvaEligibilityHint({ address, kybHref }: { address?: string; kybHref: string }) {
  const [eligible, setEligible] = useState<boolean | null>(null)

  useEffect(() => {
    if (!address) { setEligible(null); return }
    fetch(`/api/contracts/cva-eligibility/${address}`)
      .then((r) => r.json())
      .then((d) => setEligible(Boolean(d.eligible)))
      .catch(() => setEligible(null))
  }, [address])

  if (!address || eligible !== false) return null

  return (
    <a
      href={kybHref}
      className="flex items-center gap-3 p-4 bg-risk-medium/10 rounded-xl border border-risk-medium/30 hover:border-risk-medium/50 transition-colors"
    >
      <AlertTriangle size={20} className="text-risk-medium shrink-0" />
      <p className="flex-1 text-body-md text-ink">Your wallet isn&apos;t CVI-verified for A-Token settlement yet.</p>
      <span className="text-body-md font-semibold text-risk-medium flex items-center gap-1 shrink-0">Visit Verification <ArrowRight size={14} /></span>
    </a>
  )
}
