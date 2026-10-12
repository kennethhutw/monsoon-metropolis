// ⚠️ server-only — 不可在任何 'use client' 元件 import 這個資料夾底下的檔案

export interface AiCompleteParams {
  system: string
  message: string
  maxTokens: number
  model?: string
}

export interface AiClient {
  complete(params: AiCompleteParams): Promise<string>
}

export const SYSTEM_PROMPT = `You are a senior corporate finance risk-control expert
at an Asia-focused commercial bank's trade finance division, specializing in
on-chain trade receivables financing risk analysis.
Respond in English, from a bank practitioner's perspective, with a specific,
professional, and concise response (under 150 words).
Style: lead with the conclusion, no filler, use concrete numbers.`
