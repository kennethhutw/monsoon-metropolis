import { DimensionScore, RiskProfile } from '@/types/risk'
import { RiskLevel } from '@/types/case'

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 70) return 'low'
  if (score >= 45) return 'medium'
  return 'high'
}

// 加權計算總分
// 財務 30% + 鏈上行為 35% + 產業環境 25% + ESG 10%
export function calculateWeightedTotal(profile: Pick<RiskProfile, 'financial' | 'onchain' | 'macro' | 'esg'>): {
  totalScore: number
  riskLevel: RiskLevel
} {
  const avg = (scores: DimensionScore[]) =>
    scores.reduce((sum, s) => sum + s.score, 0) / scores.length

  const totalScore = Math.round(
    avg(profile.financial) * 0.30 +
    avg(profile.onchain)   * 0.35 +
    avg(profile.macro)     * 0.25 +
    avg(profile.esg)       * 0.10
  )

  return { totalScore, riskLevel: scoreToRiskLevel(totalScore) }
}

// TODO（正式版）：各指標原始數據來源替換為真實 API
// 目前接受已正規化的 0-100 分數作為輸入
export function normalizeScore(raw: number, min: number, max: number, invert = false): number {
  const normalized = Math.round(((raw - min) / (max - min)) * 100)
  const clamped = Math.max(0, Math.min(100, normalized))
  return invert ? 100 - clamped : clamped
}
