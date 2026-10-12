export const AI_FALLBACKS = {
  dashboard: `⚠️ AI analysis is temporarily unavailable. Default recommendations:
1. Check whether high-risk cases' buyer concentration exceeds the 70% threshold.
2. Confirm the on-chain invoice hash verification status for this week's new cases.
3. Watch for the impact of exchange-rate volatility on USD-denominated financing cases.`,
  risk:    '⚠️ AI risk explanation is temporarily unavailable. Please use manual judgment based on the four-dimension scores, focusing on red-flagged indicators (<60 points).',
  case:    '⚠️ AI case assessment is temporarily unavailable. Please conduct manual review based on the risk score and risk level.',
  alerts:  '⚠️ AI alert guidance is temporarily unavailable. Please prioritize by alert level (High → Medium → Low).',
  adverseMedia: '⚠️ News scan is temporarily unavailable. Please conduct manual due diligence on the exporter and buyer if needed.',
}
