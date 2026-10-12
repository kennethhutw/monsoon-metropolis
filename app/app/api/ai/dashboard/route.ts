import { NextRequest, NextResponse } from 'next/server'
import { aiClient, isAiAvailable, SYSTEM_PROMPT } from '@/lib/ai'
import { AI_FALLBACKS } from '@/lib/aiFallbacks'

export async function POST(request: NextRequest) {
  if (!isAiAvailable()) {
    return NextResponse.json({ suggestions: AI_FALLBACKS.dashboard, isFallback: true }, { status: 200 })
  }
  try {
    const { stats, query } = await request.json()

    const userMessage = query
      ? `${query}\n\nCurrent platform data: ${JSON.stringify(stats)}`
      : `Based on today's platform data below, provide 3 key risk-control recommendations:\n${JSON.stringify(stats)}`

    const text = await aiClient.complete({ system: SYSTEM_PROMPT, message: userMessage, maxTokens: 1000 })

    return NextResponse.json({ suggestions: text, isFallback: false })
  } catch (error) {
    console.error('[AI] dashboard error:', error)
    return NextResponse.json(
      { suggestions: AI_FALLBACKS.dashboard, isFallback: true },
      { status: 200 }    // 200：不讓前端顯示錯誤，fallback 即可
    )
  }
}
