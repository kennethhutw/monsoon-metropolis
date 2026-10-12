'use client'
import { PageLayout } from '@/components/shared/PageLayout'
import { Info } from 'lucide-react'

export default function AdminAIConfigPage() {
  return (
    <PageLayout title="AI Settings" subtitle="Claude API configuration and model management">
      <div className="max-w-lg space-y-4">
        <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6 space-y-1">
          {[['Model','claude-sonnet-4-20250514'],['Max Tokens','1000'],['Language','English'],['Role Persona','Asia trade finance risk-control expert']].map(([k,v]) => (
            <div key={k} className="flex justify-between py-3 border-b border-border-subtle last:border-0">
              <span className="text-body-md text-on-surface-variant">{k}</span>
              <span className="text-body-md font-medium text-ink font-mono">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-primary-fixed/30 rounded-xl border border-primary-fixed-dim p-4 flex items-start gap-2">
          <Info size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-body-md text-primary">ANTHROPIC_API_KEY is set in .env.local and is only accessible server-side.</p>
        </div>
      </div>
    </PageLayout>
  )
}
