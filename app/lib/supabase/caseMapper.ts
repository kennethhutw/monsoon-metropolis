// Maps between the Supabase `cases` row shape (snake_case, see
// supabase/migrations/20260731000000_init_schema.sql) and the FinanceCase
// shape the frontend already consumes (types/case.ts). `id` in FinanceCase
// maps to the row's `case_number` (human-readable, e.g. "TBC-2024-089"),
// not the internal uuid — that's what URLs and existing pages already use.

import type { FinanceCase } from '@/types/case'

export interface CaseRow {
  id: string
  case_number: string
  company_name: string
  finance_type: string
  amount: number | string
  stage: string
  risk_level: string
  risk_score: number | string
  buyer_concentration: number | string
  invoice_hash: string | null
  chain_tx_hash: string | null
  is_mock: boolean
  created_at: string
  updated_at: string
  invoice_token_id: number | string | null
  financing_case_id: number | string | null
  exporter_wallet: string | null
  buyer_wallet: string | null
  buyer_confirmed_at: string | null
  buyer_confirmed_tx_hash: string | null
  submitted_tx_hash: string | null
  submitted_at: string | null
  approved_tx_hash: string | null
  approved_at: string | null
  rejected_tx_hash: string | null
  rejected_at: string | null
  disbursed_tx_hash: string | null
  disbursed_at: string | null
  repaid_tx_hash: string | null
  repaid_at: string | null
  buyer_name: string | null
  invoice_number: string | null
  due_date: string | null
  currency: string
  industry: string | null
  buyer_country: string | null
  exporter_country: string | null
}

export function mapRowToCase(row: CaseRow): FinanceCase {
  return {
    id: row.case_number,
    companyName: row.company_name,
    financeType: row.finance_type as FinanceCase['financeType'],
    amount: Number(row.amount),
    stage: row.stage as FinanceCase['stage'],
    riskLevel: row.risk_level as FinanceCase['riskLevel'],
    riskScore: Number(row.risk_score),
    buyerConcentration: Number(row.buyer_concentration),
    invoiceHash: row.invoice_hash ?? undefined,
    chainTxHash: row.chain_tx_hash ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isMock: row.is_mock ? true : undefined,
    invoiceTokenId: row.invoice_token_id != null ? Number(row.invoice_token_id) : undefined,
    financingCaseId: row.financing_case_id != null ? Number(row.financing_case_id) : undefined,
    exporterWallet: row.exporter_wallet ?? undefined,
    buyerWallet: row.buyer_wallet ?? undefined,
    buyerConfirmedAt: row.buyer_confirmed_at ?? undefined,
    buyerConfirmedTxHash: row.buyer_confirmed_tx_hash ?? undefined,
    submittedTxHash: row.submitted_tx_hash ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    approvedTxHash: row.approved_tx_hash ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    rejectedTxHash: row.rejected_tx_hash ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
    disbursedTxHash: row.disbursed_tx_hash ?? undefined,
    disbursedAt: row.disbursed_at ?? undefined,
    repaidTxHash: row.repaid_tx_hash ?? undefined,
    repaidAt: row.repaid_at ?? undefined,
    buyerName: row.buyer_name ?? undefined,
    invoiceNumber: row.invoice_number ?? undefined,
    dueDate: row.due_date ?? undefined,
    currency: row.currency,
    industry: row.industry ?? undefined,
    buyerCountry: row.buyer_country ?? undefined,
    exporterCountry: row.exporter_country ?? undefined,
  }
}

/** e.g. "FPE-2026-483" — 3-letter prefix from the company name + year + random suffix. */
export function generateCaseNumber(companyName: string): string {
  const letters = companyName.replace(/[^A-Za-z]/g, '').toUpperCase()
  const prefix = (letters.slice(0, 3) || 'GEN').padEnd(3, 'X')
  const year = new Date().getFullYear()
  const suffix = Math.floor(100 + Math.random() * 900)
  return `${prefix}-${year}-${suffix}`
}
