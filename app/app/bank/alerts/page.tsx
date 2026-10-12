'use client'
import { useState, useEffect } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { Alert, AlertLevel } from '@/data/mockAlerts'
import { Bot, AlertOctagon, AlertTriangle, Info, RotateCcw } from 'lucide-react'

interface Threshold { label: string; key: string; value: number; min: number; max: number; step: number; unit: string; warnAbove: boolean }

const DEFAULT_THRESHOLDS: Threshold[] = [
  { label: 'Buyer Concentration Limit', key: 'buyerConc',    value: 70, min: 30, max: 100, step: 5,   unit: '%',  warnAbove: true  },
  { label: 'Overdue Rate Threshold',    key: 'overdueRate',  value: 3,  min: 1,  max: 10,  step: 0.5, unit: '%',  warnAbove: true  },
  { label: 'Single Borrower Limit',     key: 'singleBorrower',value: 20, min: 5,  max: 50,  step: 5,   unit: '%',  warnAbove: true  },
]

function ThresholdSlider({ t, onChange }: { t: Threshold; onChange: (key: string, val: number) => void }) {
  const pct = ((t.value - t.min) / (t.max - t.min)) * 100
  const isWarn = t.warnAbove && t.value >= t.max * 0.8
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-body-md text-on-surface-variant">{t.label}</span>
        <span className={`text-body-md font-bold font-mono ${isWarn ? 'text-error' : 'text-ink'}`}>
          {t.value}{t.unit}
        </span>
      </div>
      <input type="range" min={t.min} max={t.max} step={t.step} value={t.value}
        onChange={e => onChange(t.key, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${isWarn ? 'var(--risk-high)' : 'var(--primary-container)'} ${pct}%, var(--surface-container-highest) ${pct}%)` }}
      />
      <div className="flex justify-between text-label-md text-ink-faint mt-1 font-mono">
        <span>{t.min}{t.unit}</span><span>{t.max}{t.unit}</span>
      </div>
    </div>
  )
}

const LEVEL_TONE: Record<AlertLevel, string> = {
  high: 'bg-error-container/40 border-error/30',
  medium: 'bg-risk-medium/10 border-risk-medium/30',
  low: 'bg-surface-container-low border-border-subtle',
}
const LEVEL_LABEL: Record<AlertLevel, string> = { high: 'High', medium: 'Medium', low: 'Low' }
const LEVEL_ICON: Record<AlertLevel, typeof AlertOctagon> = { high: AlertOctagon, medium: AlertTriangle, low: Info }
const LEVEL_ICON_COLOR: Record<AlertLevel, string> = { high: 'text-error', medium: 'text-risk-medium', low: 'text-on-surface-variant' }

export default function BankAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [thresholds, setThresholds] = useState<Threshold[]>(DEFAULT_THRESHOLDS)

  const updateThreshold = (key: string, val: number) => {
    setThresholds(prev => prev.map(t => t.key === key ? { ...t, value: val } : t))
  }

  useEffect(() => {
    fetch('/api/mock/alerts').then(r => r.json()).then(data => {
      setAlerts(data)
      setAiLoading(true)
      fetch('/api/ai/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alerts: data }),
      }).then(r => r.json()).then(d => setAiText(d.advice)).finally(() => setAiLoading(false))
    }).catch(() => setError('Failed to load alerts')).finally(() => setLoading(false))
  }, [])

  return (
    <PageLayout title="Alert Center" subtitle="Real-time risk alerts">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DataWrapper data={alerts} loading={loading} error={error}
            empty={<EmptyState icon="✅" title="No alerts at this time — system operating normally" />}
            skeleton={<div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
          >
            {data => (
              <div className="space-y-3">
                {data.map(a => {
                  const Icon = LEVEL_ICON[a.level]
                  return (
                    <div key={a.id} className={`rounded-xl border p-5 ${LEVEL_TONE[a.level]}`}>
                      <div className="flex items-start gap-3">
                        <Icon size={20} className={`shrink-0 mt-0.5 ${LEVEL_ICON_COLOR[a.level]}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-body-md font-bold text-ink">{a.title}</span>
                            <span className="text-label-md font-medium px-1.5 py-0.5 rounded-full border border-border-subtle font-mono">{LEVEL_LABEL[a.level]} Risk</span>
                          </div>
                          <p className="text-body-md text-on-surface-variant leading-relaxed">{a.description}</p>
                          <p className="text-label-md text-ink-faint mt-2">{formatDate(a.timestamp)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </DataWrapper>
        </div>
        <div className="space-y-6">
          <div className="bg-primary/[0.03] rounded-xl border border-border-subtle shadow-card p-6">
            <div className="flex items-center gap-2 mb-3"><Bot size={18} className="text-primary" /><h2 className="text-title-lg font-bold text-on-surface">AI Recommended Actions</h2></div>
            {aiLoading ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
              : <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap italic">{aiText}</p>}
          </div>

          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-title-lg font-bold text-on-surface">Threshold Settings</h2>
              <button onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
                className="text-ink-faint hover:text-primary transition-colors" aria-label="Reset to defaults">
                <RotateCcw size={16} />
              </button>
            </div>
            {thresholds.map(t => (
              <ThresholdSlider key={t.key} t={t} onChange={updateThreshold} />
            ))}
            <p className="text-label-md text-ink-faint mt-4 pt-4 border-t border-border-subtle">
              Threshold changes apply only to this session
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
