import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { aiClient, isAiAvailable } from '@/lib/ai'
import { AI_FALLBACKS } from '@/lib/aiFallbacks'

// Adverse-media (negative news) triage for a case's exporter/buyer companies.
// AI-assisted only — NOT a substitute for formal AML/sanctions screening.
// See docs/changes/20260805_負面新聞掃描功能.md

const EXA_SEARCH_URL = 'https://api.exa.ai/search'
const DEFAULT_LOOKBACK_DAYS = 365

interface ExaCandidate {
  title: string | null
  url: string
  publishedDate?: string
  highlight?: string
  subject: string // which company this result came from (companyName or buyerName)
}

interface NewsSource {
  title: string
  url: string
  publishedDate?: string
}

async function searchExa(subject: string, sinceISO: string | null): Promise<ExaCandidate[]> {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey) throw new Error('EXA_API_KEY is not set')

  const startPublishedDate = sinceISO ?? new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const res = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `${subject} lawsuit fraud sanctions bankruptcy financial trouble controversy`,
      category: 'news',
      type: process.env.DEMO_EXA_SEARCH_TYPE ?? 'auto',
      numResults: Number(process.env.DEMO_EXA_MAX_RESULTS_PER_LEAD ?? 8),
      startPublishedDate,
      contents: { highlights: true },
    }),
  })
  if (!res.ok) throw new Error(`Exa search failed (${res.status}): ${await res.text()}`)

  const data = (await res.json()) as {
    results?: { title: string | null; url: string; publishedDate?: string; highlights?: string[] }[]
  }
  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    publishedDate: r.publishedDate,
    highlight: r.highlights?.[0],
    subject,
  }))
}

// AI only picks which candidates (by index) look negative and writes a short
// summary — it never re-types URLs, so we can't end up with a hallucinated
// or altered link. Sources always come straight from Exa's own results.
async function classifyCandidates(candidates: ExaCandidate[]): Promise<{ summary: string; flagged: number[] }> {
  if (candidates.length === 0) {
    return { summary: 'No recent public news found for this search window.', flagged: [] }
  }

  const list = candidates
    .map((c, i) => `[${i}] Company: ${c.subject}\nTitle: ${c.title ?? '(untitled)'}\nDate: ${c.publishedDate ?? 'unknown'}\nSnippet: ${c.highlight ?? '(no snippet)'}`)
    .join('\n\n')

  const system = `You are a bank compliance analyst doing a lightweight adverse-media triage on search results.
Decide which numbered items (if any) describe negative or controversial matters — lawsuits, fraud, sanctions,
bankruptcy, financial distress, regulatory action, executive misconduct. Most results will be unrelated noise
(unrelated companies with similar names, routine business news) — do not flag those.
Respond in EXACTLY this format, nothing else:
FLAGGED: <comma-separated indices, or NONE>
SUMMARY: <one short paragraph, under 80 words, plain English, no markdown>`

  const text = await aiClient.complete({ system, message: list, maxTokens: 400 })

  const flaggedMatch = text.match(/FLAGGED:\s*(.*)/i)
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*)/i)

  const flagged = (flaggedMatch?.[1] ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < candidates.length)

  const summary = summaryMatch?.[1]?.trim() || 'No adverse media found in recent public news.'
  return { summary, flagged }
}

// Used both when no AI provider is configured and when the AI call itself
// fails — either way we still have real Exa results worth keeping.
function rawLinksResult(candidates: ExaCandidate[]): { summary: string; sources: NewsSource[] } {
  return {
    summary: candidates.length > 0
      ? `AI review unavailable — showing all ${candidates.length} recent news result(s) found for this search, unfiltered. Please review manually.`
      : 'No recent public news found for this search window.',
    sources: candidates.map((c) => ({ title: c.title ?? c.url, url: c.url, publishedDate: c.publishedDate })),
  }
}

export async function GET(request: NextRequest) {
  try {
    const caseNumber = request.nextUrl.searchParams.get('caseNumber')
    if (!caseNumber) {
      return NextResponse.json({ error: 'Missing caseNumber' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: caseRow } = await supabase.from('cases').select('id').eq('case_number', caseNumber).maybeSingle()
    if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const { data: scans, error } = await supabase
      .from('case_news_scans')
      .select('id, searched_at, since_date, summary, sources, ai_provider')
      .eq('case_id', caseRow.id)
      .order('searched_at', { ascending: false })
    if (error) throw error

    return NextResponse.json({ history: scans ?? [] })
  } catch (error) {
    console.error('[API] adverse-media GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch news scan history', code: 'NEWS_SCAN_FETCH_ERROR' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient()
  try {
    const { caseNumber } = (await request.json()) as { caseNumber?: string }
    if (!caseNumber) return NextResponse.json({ error: 'Missing caseNumber' }, { status: 400 })

    const { data: caseRow, error: caseError } = await supabase
      .from('cases')
      .select('id, company_name, buyer_name')
      .eq('case_number', caseNumber)
      .maybeSingle()
    if (caseError) throw caseError
    if (!caseRow) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const { data: previousScan } = await supabase
      .from('case_news_scans')
      .select('searched_at')
      .eq('case_id', caseRow.id)
      .order('searched_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sinceISO = previousScan?.searched_at ?? null

    const subjects = [caseRow.company_name, caseRow.buyer_name].filter((s): s is string => Boolean(s))
    const candidateLists = await Promise.all(subjects.map((subject) => searchExa(subject, sinceISO)))
    const candidates = candidateLists.flat()

    // AI classification is best-effort — if no provider is configured, skip
    // straight to raw links (no wasted call, no misleading error log). If a
    // configured provider errors out mid-call, degrade the same way instead
    // of discarding the Exa results.
    let summary: string
    let sources: NewsSource[]
    let aiProvider: string
    if (!isAiAvailable()) {
      ;({ summary, sources } = rawLinksResult(candidates))
      aiProvider = 'none'
    } else {
      try {
        const result = await classifyCandidates(candidates)
        summary = result.summary
        sources = result.flagged.map((i) => ({
          title: candidates[i].title ?? candidates[i].url,
          url: candidates[i].url,
          publishedDate: candidates[i].publishedDate,
        }))
        aiProvider =
          process.env.AI_PROVIDER === 'openrouter'
            ? `openrouter:${process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4'}`
            : 'anthropic'
      } catch (aiError) {
        console.warn('[AI] adverse-media classification failed, falling back to raw links:', aiError)
        ;({ summary, sources } = rawLinksResult(candidates))
        aiProvider = 'none'
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('case_news_scans')
      .insert({
        case_id: caseRow.id,
        since_date: sinceISO,
        summary,
        sources,
        ai_provider: aiProvider,
      })
      .select('id, searched_at, since_date, summary, sources, ai_provider')
      .single()
    if (insertError) throw insertError

    return NextResponse.json({ scan: inserted, isFallback: false })
  } catch (error) {
    console.error('[AI] adverse-media error:', error)
    // Deliberately not written to case_news_scans — a failed scan shouldn't
    // get cached as if it were a real "nothing found" result.
    return NextResponse.json(
      { scan: { summary: AI_FALLBACKS.adverseMedia, sources: [], searched_at: new Date().toISOString() }, isFallback: true },
      { status: 200 }
    )
  }
}
