// ⚠️ server-only — 不可在任何 'use client' 元件 import 此檔案
import type { AiClient } from './types'

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4'

export const openrouterClient: AiClient = {
  async complete({ system, message, maxTokens, model }) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('AI_PROVIDER is "openrouter" but OPENROUTER_API_KEY is not set')
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`OpenRouter request failed (${res.status}): ${await res.text()}`)
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] }
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('OpenRouter response had no message content')
    return text
  },
}
