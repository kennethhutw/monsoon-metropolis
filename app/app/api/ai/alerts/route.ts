import { NextRequest, NextResponse } from 'next/server'
import { aiClient, isAiAvailable, SYSTEM_PROMPT } from '@/lib/ai'
import { AI_FALLBACKS } from '@/lib/aiFallbacks'

export async function POST(request: NextRequest) {
  if (!isAiAvailable()) {
    return NextResponse.json({ advice: AI_FALLBACKS.alerts, isFallback: true }, { status: 200 })
  }
  try {
    const { alerts, question } = await request.json()

    const userMessage = question
      ? `${question}\n\nCurrent alert list: ${JSON.stringify(alerts)}`
      : `For the following alerts, provide a handling priority order and recommended actions:\n${JSON.stringify(alerts)}`

    const text = await aiClient.complete({ system: SYSTEM_PROMPT, message: userMessage, maxTokens: 800 })

    return NextResponse.json({ advice: text, isFallback: false })
  } catch (error) {
    console.error('[AI] alerts error:', error)
    return NextResponse.json(
      { advice: AI_FALLBACKS.alerts, isFallback: true },
      { status: 200 }
    )
  }
}
