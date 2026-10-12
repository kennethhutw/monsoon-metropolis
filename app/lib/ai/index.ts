// 這個檔案是所有 AI 呼叫的統一出口
// 依 AI_PROVIDER 決定用哪個實作，不要在 route 裡直接 import
// lib/ai/anthropic.ts 或 lib/ai/openrouter.ts
import { anthropicClient } from './anthropic'
import { openrouterClient } from './openrouter'
import type { AiClient } from './types'

export const aiClient: AiClient =
  process.env.AI_PROVIDER === 'openrouter' ? openrouterClient : anthropicClient

// Lets callers skip straight to the fallback when no key is configured,
// instead of attempting the call, failing, and logging a stack trace for
// something that was never going to work.
export function isAiAvailable(): boolean {
  return process.env.AI_PROVIDER === 'openrouter'
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY)
}

const KIMI_MODEL = 'moonshotai/kimi-k2.6'

// Case risk assessment can be switched to Kimi (via OpenRouter) independently
// of the global AI_PROVIDER; unset or "default" keeps the existing behaviour.
// Kimi K2.6 is a reasoning model and its reasoning tokens count against
// max_tokens — at 800 the visible answer came back empty on real case data.
export function getCaseAi(): { client: AiClient; model?: string; maxTokens: number; providerLabel: string; available: boolean } {
  if (process.env.CASE_AI_MODEL === 'kimi') {
    return {
      client: openrouterClient,
      model: KIMI_MODEL,
      maxTokens: 6000,
      providerLabel: `openrouter:${KIMI_MODEL}`,
      available: Boolean(process.env.OPENROUTER_API_KEY),
    }
  }
  const providerLabel =
    process.env.AI_PROVIDER === 'openrouter'
      ? `openrouter:${process.env.OPENROUTER_MODEL ?? 'anthropic/claude-sonnet-4'}`
      : 'anthropic'
  return { client: aiClient, maxTokens: 800, providerLabel, available: isAiAvailable() }
}

export { SYSTEM_PROMPT } from './types'
export type { AiCompleteParams, AiClient } from './types'
