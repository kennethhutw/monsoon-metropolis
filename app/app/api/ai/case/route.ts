import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { getCaseAi, SYSTEM_PROMPT } from '@/lib/ai'
import { AI_FALLBACKS } from '@/lib/aiFallbacks'

// AI case assessment — generated on demand and kept as history in
// case_ai_assessments. See docs/changes/20261006_AI案件評估改手動並保留歷史.md

// Structured output so the panel can render a recommendation badge + bullets
// (see docs/changes/20261006_AI評估輸出格式化.md). Unparseable output still
// displays as plain text.
const FORMAT_INSTRUCTION = `

Format the answer EXACTLY as follows, plain text only (no markdown, no bold):
RECOMMENDATION: <APPROVE, REVIEW or REJECT>
SUMMARY: <one sentence conclusion>
KEY POINTS:
- <3 to 4 points, each under 25 words, with concrete numbers>
ACTION: <one sentence next step for the reviewer>`

const HISTORY_LIMIT = 20
const COLUMNS = 'id, evaluation, ai_provider, created_by, created_at'

// Returns null when the case isn't in Supabase (e.g. a mock-only case) or
// Supabase isn't configured — callers then skip persistence instead of failing.
async function findCaseId(caseNumber: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient().from('cases').select('id').eq('case_number', caseNumber).maybeSingle()
    return data?.id ?? null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['bank', 'researcher', 'admin'])
  if (auth.error) return auth.error
  try {
    const caseNumber = request.nextUrl.searchParams.get('caseNumber')
    if (!caseNumber) {
      return NextResponse.json({ error: 'Missing caseNumber', code: 'MISSING_CASE_NUMBER' }, { status: 400 })
    }
    const caseId = await findCaseId(caseNumber)
    if (!caseId) return NextResponse.json({ history: [] })

    const { data, error } = await createAdminClient()
      .from('case_ai_assessments')
      .select(COLUMNS)
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT)
    if (error) throw error
    return NextResponse.json({ history: data ?? [] })
  } catch (error) {
    console.error('[API] ai/case GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch assessment history', code: 'AI_CASE_HISTORY_ERROR' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['bank', 'admin'])
  if (auth.error) return auth.error

  const { client, model, maxTokens, providerLabel, available } = getCaseAi()
  if (!available) {
    return NextResponse.json({ evaluation: AI_FALLBACKS.case, isFallback: true, saved: false }, { status: 200 })
  }
  try {
    const { caseNumber, caseData, question } = await request.json()

    const userMessage = question
      ? `${question}\n\nCase data: ${JSON.stringify(caseData)}`
      : `Assess the risk of the following financing case and give a review recommendation:\n${JSON.stringify(caseData)}`

    const text = await client.complete({ system: SYSTEM_PROMPT + FORMAT_INSTRUCTION, message: userMessage, maxTokens, model })

    // Saving is best-effort: a generated assessment is still returned (marked
    // saved: false) if the case isn't in Supabase or the insert fails.
    let record = null
    try {
      const caseId = caseNumber ? await findCaseId(caseNumber) : null
      if (caseId) {
        const { data, error } = await createAdminClient()
          .from('case_ai_assessments')
          .insert({ case_id: caseId, evaluation: text, ai_provider: providerLabel, created_by: auth.session.email })
          .select(COLUMNS)
          .single()
        if (error) throw error
        record = data
      }
    } catch (saveError) {
      console.error('[AI] case assessment save failed:', saveError)
    }

    return NextResponse.json({ evaluation: text, isFallback: false, saved: record !== null, record, aiProvider: providerLabel })
  } catch (error) {
    console.error('[AI] case error:', error)
    // Deliberately not saved — a failed call shouldn't be stored as an assessment.
    return NextResponse.json({ evaluation: AI_FALLBACKS.case, isFallback: true, saved: false }, { status: 200 })
  }
}
