// 🔵 MOCK DATA — 替換說明見下方 TODO
// TODO（Supabase）：替換為：
// const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false })

export type AlertLevel = 'high' | 'medium' | 'low'

export interface Alert {
  id: string
  level: AlertLevel
  title: string
  description: string
  timestamp: string
  isMock?: true
}

export const MOCK_ALERTS: Alert[] = [
  {
    id: 'alert-001',
    level: 'high',
    title: 'High Risk: Duplicate Financing Concern',
    description: 'Formosa Precision Electronics appears to have applied for financing on the same batch of receivables with two different banks — recommend immediate freeze and investigation.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    isMock: true,
  },
  {
    id: 'alert-002',
    level: 'high',
    title: 'High Risk: Concentration Limit Exceeded',
    description: "Pacific Ocean Shipping Co.'s top three buyers account for 83% of receivables combined, exceeding the internal 70% policy limit.",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    isMock: true,
  },
  {
    id: 'alert-003',
    level: 'medium',
    title: 'Medium Risk: Exchange Rate Volatility Alert',
    description: 'USD/TWD moved 1.52% this week — recommend activating dynamic margin mechanisms for 8 USD-denominated cases.',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    isMock: true,
  },
]
