'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ExternalLink, RefreshCw, Search } from 'lucide-react'

interface NewsSource {
  title: string
  url: string
  publishedDate?: string
}

interface NewsScanRow {
  id: string
  searched_at: string
  since_date: string | null
  summary: string
  sources: NewsSource[]
  ai_provider: string
}

export function NewsScanPanel({ caseNumber }: { caseNumber: string }) {
  const [history, setHistory] = useState<NewsScanRow[] | null>(null)
  const [scanning, setScanning] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/ai/adverse-media?caseNumber=${encodeURIComponent(caseNumber)}`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data.history) ? data.history : []))
      .catch((error) => {
        console.error('[NewsScanPanel] load failed:', error)
        setHistory([])
      })
  }, [caseNumber])

  useEffect(() => { load() }, [load])

  const handleScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/ai/adverse-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseNumber }),
      })
      const data = await res.json()
      if (data.isFallback) {
        toast.error('News scan unavailable', { description: data.scan?.summary ?? 'Please try again later' })
        return
      }
      setHistory((prev) => [data.scan as NewsScanRow, ...(prev ?? [])])
    } catch (error) {
      console.error('[NewsScanPanel] scan failed:', error)
      toast.error('News scan failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setScanning(false)
    }
  }

  const latest = history?.[0]
  const pastScans = history?.slice(1) ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 bg-risk-medium/10 border border-risk-medium/20 rounded-lg p-3">
        <AlertTriangle size={16} className="text-risk-medium shrink-0 mt-0.5" />
        <p className="text-label-md text-on-surface-variant">
          AI-assisted scan of public news only — not a substitute for formal AML or sanctions screening.
        </p>
      </div>

      {history === null ? (
        <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
      ) : !latest ? (
        <div className="flex items-center justify-between gap-3 bg-surface-container-low rounded-lg border border-border-subtle p-4">
          <p className="text-body-md text-on-surface-variant">Not yet scanned for this case.</p>
          <Button onClick={handleScan} disabled={scanning} size="sm">
            <Search size={14} className="mr-1.5" /> {scanning ? 'Scanning…' : 'Scan for News'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label-md text-ink-faint">Last scanned {new Date(latest.searched_at).toLocaleString()}</p>
            <Button onClick={handleScan} disabled={scanning} variant="outline" size="sm">
              <RefreshCw size={14} className="mr-1.5" /> {scanning ? 'Scanning…' : 'Scan for Updates'}
            </Button>
          </div>
          <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4">
            <p className="text-body-md text-ink leading-relaxed">{latest.summary}</p>
            {latest.sources.length > 0 && (
              <ul className="mt-3 space-y-2">
                {latest.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-body-md text-primary hover:underline"
                    >
                      <ExternalLink size={13} className="shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </a>
                    {s.publishedDate && <p className="text-label-md text-ink-faint ml-[19px]">{new Date(s.publishedDate).toLocaleDateString()}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pastScans.length > 0 && (
            <details className="text-body-md">
              <summary className="cursor-pointer text-on-surface-variant hover:text-ink">Past scans ({pastScans.length})</summary>
              <div className="mt-3 space-y-3">
                {pastScans.map((scan) => (
                  <div key={scan.id} className="bg-surface-container-low rounded-lg border border-border-subtle p-3">
                    <p className="text-label-md text-ink-faint mb-1">{new Date(scan.searched_at).toLocaleString()}</p>
                    <p className="text-body-md text-on-surface-variant">{scan.summary}</p>
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
