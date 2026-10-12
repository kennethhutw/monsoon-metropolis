import { NextRequest, NextResponse } from 'next/server'
import { aiClient, isAiAvailable, SYSTEM_PROMPT } from '@/lib/ai'
import { AI_FALLBACKS } from '@/lib/aiFallbacks'

export async function POST(request: NextRequest) {
  if (!isAiAvailable()) {
    return NextResponse.json({ analysis: AI_FALLBACKS.risk, isFallback: true }, { status: 200 })
  }
  try {
    const { profile, question } = await request.json()

    const userMessage = question
      ? `${question}\n\nRisk profile: ${JSON.stringify(profile)}`
      : `For the following risk profile, explain the main risk points and recommended measures:\n${JSON.stringify(profile)}`

    const text = await aiClient.complete({ system: SYSTEM_PROMPT, message: userMessage, maxTokens: 800 })

    return NextResponse.json({ analysis: text, isFallback: false })
  } catch (error) {
    console.error('[AI] risk error:', error)
    return NextResponse.json(
      { analysis: AI_FALLBACKS.risk, isFallback: true },
      { status: 200 }
    )
  }
}
