// ⚠️ server-only — 不可在任何 'use client' 元件 import 此檔案
import Anthropic from '@anthropic-ai/sdk'
import type { AiClient } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const anthropicClient: AiClient = {
  async complete({ system, message, maxTokens }) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: message }],
    })
    return response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
  },
}
