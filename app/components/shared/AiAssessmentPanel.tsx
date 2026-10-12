'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, RefreshCw } from 'lucide-react'
import type { FinanceCase } from '@/types/case'

interface AssessmentRow {
  id: string
  evaluation: string
  ai_provider: string
  created_by: string | null
  created_at: string
}

function modelLabel(provider: string): string {
  return provider.startsWith('openrouter:') ? provider.slice('openrouter:'.length) : provider
}

type Recommendation = 'APPROVE' | 'REVIEW' | 'REJECT'

interface ParsedAssessment {
  recommendation: Recommendation
  summary: string
  points: string[]
  action: string
}

// Returns null when the text doesn't follow the structured format (older
// plain-text records, or a model that ignored the instruction).
function parseAssessment(raw: string): ParsedAssessment | null {
  const text = raw.replace(/\*\*/g, '')
  const rec = text.match(/RECOMMENDATION:\s*(APPROVE|REVIEW|REJECT)/i)
  if (!rec) return null
  const summary = text.match(/SUMMARY:\s*([\s\S]*?)(?=\n\s*KEY POINTS:|\n\s*ACTION:|$)/i)?.[1]?.trim() ?? ''
  const pointsBlock = text.match(/KEY POINTS:\s*([\s\S]*?)(?=\n\s*ACTION:|$)/i)?.[1] ?? ''
  const points = pointsBlock
    .split('\n')
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
  const action = text.match(/ACTION:\s*([\s\S]*)$/i)?.[1]?.trim() ?? ''
  if (!summary && points.length === 0) return null
  return { recommendation: rec[1].toUpperCase() as Recommendation, summary, points, action }
}

const RECOMMENDATION_TONE: Record<Recommendation, string> = {
  APPROVE: 'bg-risk-low/10 text-risk-low border-risk-low/30',
  REVIEW: 'bg-risk-medium/10 text-risk-medium border-risk-medium/30',
  REJECT: 'bg-risk-high/10 text-risk-high border-risk-high/30',
}

function AssessmentBody({ text }: { text: string }) {
  const parsed = parseAssessment(text)
  if (!parsed) {
    return <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{text}</p>
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className={`shrink-0 px-2.5 py-1 rounded-md border text-label-md font-bold tracking-wide ${RECOMMENDATION_TONE[parsed.recommendation]}`}>
          {parsed.recommendation}
        </span>
        <p className="text-body-md font-semibold text-ink leading-snug pt-0.5">{parsed.summary}</p>
      </div>
      {parsed.points.length > 0 && (
        <ul className="space-y-1.5">
          {parsed.points.map((point, i) => (
            <li key={i} className="flex gap-2.5 text-body-md text-on-surface-variant leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-outline" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
      {parsed.action && (
        <div className="rounded-md bg-primary/5 px-3 py-2 text-body-md">
          <span className="mr-2 text-label-md font-bold uppercase text-primary">Next step</span>
          <span className="text-on-surface-variant">{parsed.action}</span>
        </div>
      )}
    </div>
  )
}

function AssessmentMeta({ row, unsaved }: { row: AssessmentRow; unsaved?: boolean }) {
  return (
    <p className="text-label-md text-ink-faint">
      {new Date(row.created_at).toLocaleString()} · {modelLabel(row.ai_provider)}
      {row.created_by ? ` · ${row.created_by}` : ''}
      {unsaved && <span className="ml-2 px-1.5 py-0.5 rounded bg-risk-medium/10 text-risk-medium font-medium">Not saved</span>}
    </p>
  )
}

export function AiAssessmentPanel({ caseNumber, caseData }: { caseNumber: string; caseData: FinanceCase }) {
  const [history, setHistory] = useState<AssessmentRow[] | null>(null)
  const [unsaved, setUnsaved] = useState<AssessmentRow | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/ai/case?caseNumber=${encodeURIComponent(caseNumber)}`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data.history) ? data.history : []))
      .catch((error) => {
        console.error('[AiAssessmentPanel] load failed:', error)
        setHistory([])
      })
  }, [caseNumber])

  useEffect(() => { load() }, [load])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseNumber, caseData }),
      })
      const data = await res.json()
      if (!res.ok || data.isFallback) {
        toast.error('AI assessment unavailable', { description: 'Nothing was saved. Please try again.' })
        return
      }
      if (data.saved && data.record) {
        setUnsaved(null)
        setHistory((prev) => [data.record as AssessmentRow, ...(prev ?? [])])
      } else {
        setUnsaved({
          id: 'unsaved',
          evaluation: data.evaluation,
          ai_provider: typeof data.aiProvider === 'string' ? data.aiProvider : 'unknown',
          created_by: null,
          created_at: new Date().toISOString(),
        })
        toast.warning('Assessment generated but not saved', { description: 'It could not be stored in the case history.' })
      }
    } catch (error) {
      console.error('[AiAssessmentPanel] generate failed:', error)
      toast.error('AI assessment failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setGenerating(false)
    }
  }

  const shown = unsaved ?? history?.[0]
  const past = unsaved ? (history ?? []) : (history?.slice(1) ?? [])

  if (history === null) {
    return <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
  }

  return (
    <div className="space-y-4">
      {!shown ? (
        <div className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg border border-border-subtle p-4">
          <p className="text-body-md text-on-surface-variant">No assessment generated for this case yet.</p>
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            <Bot size={14} className="mr-1.5" /> {generating ? 'Generating…' : 'Generate Assessment'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <AssessmentMeta row={shown} unsaved={shown === unsaved} />
            <Button onClick={handleGenerate} disabled={generating} variant="outline" size="sm">
              <RefreshCw size={14} className={`mr-1.5 ${generating ? 'animate-spin' : ''}`} /> {generating ? 'Generating…' : 'Regenerate Assessment'}
            </Button>
          </div>
          <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4">
            <AssessmentBody text={shown.evaluation} />
          </div>

          {past.length > 0 && (
            <details className="text-body-md">
              <summary className="cursor-pointer text-on-surface-variant hover:text-ink">Past assessments ({past.length})</summary>
              <div className="mt-3 space-y-3">
                {past.map((row) => (
                  <div key={row.id} className="bg-surface-container-low rounded-lg border border-border-subtle p-3 space-y-1">
                    <AssessmentMeta row={row} />
                    <AssessmentBody text={row.evaluation} />
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
