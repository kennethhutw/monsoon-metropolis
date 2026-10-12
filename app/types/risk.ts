import { RiskLevel } from './case'

export interface DimensionScore {
  label: string
  score: number                 // 0-100
  color: 'green' | 'orange' | 'red'
}

export interface RiskProfile {
  companyId: string
  companyName: string
  totalScore: number
  riskLevel: RiskLevel
  financial: DimensionScore[]
  onchain: DimensionScore[]
  macro: DimensionScore[]
  esg: DimensionScore[]
  recommendedAmount?: number
  isMock?: true
}
