import { Code2 } from 'lucide-react'

export function DemoBadge() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null
  return (
    <span className="inline-flex items-center gap-1 text-label-md font-bold px-2 py-0.5 rounded bg-surface-container-highest text-primary border border-outline-variant font-mono">
      <Code2 size={12} strokeWidth={2.5} />
      DEMO
    </span>
  )
}
