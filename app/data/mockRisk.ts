// 🔵 MOCK DATA — 替換說明見下方 TODO
// TODO（Supabase）：替換為：
// const { data } = await supabase.from('risk_profiles').select('*').eq('company_id', companyId)

import { RiskProfile } from '@/types/risk'

export const MOCK_RISK_PROFILES: Record<string, RiskProfile> = {
  'company-tsmc-a': {
    companyId: 'company-tsmc-a',
    companyName: 'Meridian Semiconductor Components',
    totalScore: 82,
    riskLevel: 'low',
    financial: [
      { label: 'Current Ratio',                    score: 82,  color: 'green'  },
      { label: 'Debt Ratio (lower = better)',       score: 35,  color: 'orange' },
      { label: 'EBITDA Margin',                     score: 75,  color: 'green'  },
      { label: 'Receivables Turnover',               score: 68,  color: 'green'  },
    ],
    onchain: [
      { label: 'Transaction Continuity',                    score: 95,  color: 'green' },
      { label: 'Buyer Concentration (lower = better)',       score: 28,  color: 'green' },
      { label: 'On-Time Delivery Confirmation Rate',         score: 91,  color: 'green' },
      { label: 'Smart Contract Compliance Rate',             score: 100, color: 'green' },
    ],
    macro: [
      { label: 'Industry Sentiment Index',      score: 70, color: 'green'  },
      { label: 'Supply Chain Disruption Risk',  score: 22, color: 'green'  },
      { label: 'Geopolitical Exposure',         score: 40, color: 'orange' },
    ],
    esg: [
      { label: 'Carbon Footprint Disclosure',  score: 85, color: 'green' },
      { label: 'Supplier Labor Compliance',    score: 78, color: 'green' },
      { label: 'Corporate Governance Score',   score: 80, color: 'green' },
    ],
    recommendedAmount: 80000000,
    isMock: true,
  },
  'company-precision': {
    companyId: 'company-precision',
    companyName: 'Formosa Precision Electronics',
    totalScore: 54,
    riskLevel: 'high',
    financial: [
      { label: 'Current Ratio',                    score: 55, color: 'orange' },
      { label: 'Debt Ratio (lower = better)',       score: 72, color: 'red'    },
      { label: 'EBITDA Margin',                     score: 48, color: 'red'    },
      { label: 'Receivables Turnover',               score: 40, color: 'red'    },
    ],
    onchain: [
      { label: 'Transaction Continuity',                    score: 60, color: 'orange' },
      { label: 'Buyer Concentration (lower = better)',       score: 78, color: 'red'    },
      { label: 'On-Time Delivery Confirmation Rate',         score: 55, color: 'orange' },
      { label: 'Smart Contract Compliance Rate',             score: 80, color: 'green'  },
    ],
    macro: [
      { label: 'Industry Sentiment Index',      score: 52, color: 'orange' },
      { label: 'Supply Chain Disruption Risk',  score: 60, color: 'red'    },
      { label: 'Geopolitical Exposure',         score: 55, color: 'orange' },
    ],
    esg: [
      { label: 'Carbon Footprint Disclosure',  score: 40, color: 'red'    },
      { label: 'Supplier Labor Compliance',    score: 50, color: 'orange' },
      { label: 'Corporate Governance Score',   score: 45, color: 'red'    },
    ],
    isMock: true,
  },
}
