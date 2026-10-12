'use client'
import { useState } from 'react'
import { PageLayout } from '@/components/shared/PageLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { MOCK_RISK_PROFILES } from '@/data/mockRisk'
import { RiskProfile, DimensionScore } from '@/types/risk'
import { getRiskColor, getRiskBg } from '@/lib/utils'
import { Bot, RefreshCw } from 'lucide-react'

const COLOR_MAP = { green: 'var(--risk-low)', orange: 'var(--risk-medium)', red: 'var(--risk-high)' }
const RISK_LABEL: Record<'low' | 'medium' | 'high', string> = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' }

function ScoreBar({ d }: { d: DimensionScore }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-body-md text-on-surface-variant w-40 shrink-0">{d.label}</span>
      <div className="flex-1 h-2 bg-surface-container-low rounded-full">
        <div className="h-full rounded-full transition-all" style={{ width: `${d.score}%`, background: COLOR_MAP[d.color] }} />
      </div>
      <span className="text-body-md font-bold w-8 text-right" style={{ color: COLOR_MAP[d.color] }}>{d.score}</span>
    </div>
  )
}

function DimSection({ title, scores }: { title: string; scores: DimensionScore[] }) {
  return (
    <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-6">
      <h3 className="text-title-lg font-bold text-on-surface mb-3">{title}</h3>
      {scores.map(d => <ScoreBar key={d.label} d={d} />)}
    </div>
  )
}

export default function BankRiskPage() {
  const companies = Object.values(MOCK_RISK_PROFILES)
  const [selected, setSelected] = useState<RiskProfile>(companies[0])
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)

  const fetchAI = (profile: RiskProfile, question?: string) => {
    setAiLoading(true)
    fetch('/api/ai/risk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, question }),
    }).then(r => r.json()).then(d => setAiText(d.analysis)).finally(() => setAiLoading(false))
  }

  const handleSelect = (p: RiskProfile) => { setSelected(p); setActiveChip(null); fetchAI(p) }

  return (
    <PageLayout title="Risk Analysis" subtitle="Four-dimension enterprise risk assessment">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Company selector */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-label-md font-bold text-ink-faint px-1 mb-2 uppercase tracking-wide font-mono">Select Company</h2>
          {companies.map(p => (
            <button key={p.companyId} onClick={() => handleSelect(p)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selected.companyId === p.companyId ? 'bg-primary-fixed/30 border-primary-fixed-dim' : 'bg-surface border-border-subtle hover:bg-surface-container-low'}`}>
              <p className="text-body-md font-semibold text-ink">{p.companyName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-body-md font-bold font-mono" style={{ color: getRiskColor(p.riskLevel) }}>{p.totalScore} pts</span>
                <span className="text-label-md px-1.5 py-0.5 rounded-full" style={{ color: getRiskColor(p.riskLevel), background: getRiskBg(p.riskLevel) }}>
                  {RISK_LABEL[p.riskLevel]}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed scoring */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface rounded-xl border border-border-subtle shadow-card p-8 flex items-center gap-8">
            <div className="text-center shrink-0">
              <p className="text-display-lg font-bold" style={{ color: getRiskColor(selected.riskLevel) }}>{selected.totalScore}</p>
              <p className="text-body-md text-on-surface-variant mt-1">Composite Score</p>
            </div>
            <div>
              <p className="text-headline-md font-bold text-on-surface">{selected.companyName}</p>
              <span className="text-label-md font-medium px-2 py-1 rounded-full" style={{ color: getRiskColor(selected.riskLevel), background: getRiskBg(selected.riskLevel) }}>
                {RISK_LABEL[selected.riskLevel]}
              </span>
              {selected.recommendedAmount && (
                <p className="text-body-md text-on-surface-variant mt-2">Recommended Limit: <span className="font-mono font-semibold text-primary">${(selected.recommendedAmount / 1e6).toFixed(1)}M</span></p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DimSection title="Financial Metrics (30%)" scores={selected.financial} />
            <DimSection title="On-Chain Behavior (35%)" scores={selected.onchain} />
            <DimSection title="Industry Environment (25%)" scores={selected.macro} />
            <DimSection title="ESG (10%)" scores={selected.esg} />
          </div>

          {/* AI explanation */}
          <div className="bg-primary/[0.03] rounded-xl border border-border-subtle shadow-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bot size={18} className="text-primary" />
              <h2 className="text-title-lg font-bold text-on-surface">AI Risk Explanation</h2>
              <button onClick={() => { setActiveChip(null); fetchAI(selected) }} className="ml-auto text-primary hover:opacity-80 transition-opacity">
                <RefreshCw size={16} className={aiLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            {aiLoading ? <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
              : aiText ? <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap italic">{aiText}</p>
              : <p className="text-body-md text-ink-faint">Select a company on the left to load AI analysis</p>}
            <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-border-subtle">
              {[
                { label: 'Risk Basis Explanation',       question: "Please explain in detail the main basis for this company's risk score and the key factors in each dimension." },
                { label: 'Financing Terms Recommendation', question: "Based on this company's risk profile, give specific financing term recommendations (interest rate, limit, tenor)." },
                { label: 'Stress Test',                  question: "Assuming market interest rates rise 200bps and industry conditions decline 20%, assess the change in this company's repayment capacity." },
              ].map(chip => (
                <button key={chip.label}
                  disabled={aiLoading}
                  onClick={() => { setActiveChip(chip.label); fetchAI(selected, chip.question) }}
                  className={`text-body-md px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
                    activeChip === chip.label
                      ? 'border-primary-container bg-primary-fixed/40 text-primary'
                      : 'border-border-subtle text-on-surface-variant hover:border-primary-container hover:text-primary'
                  }`}>
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
