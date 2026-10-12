import { NextRequest, NextResponse } from 'next/server'
import { keccak256, toHex } from 'viem'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapRowToCase, generateCaseNumber, type CaseRow } from '@/lib/supabase/caseMapper'

// Path kept as /api/mock/cases for backward compatibility — 8 existing pages
// already depend on this URL and response shape. It's no longer mock data;
// see docs/changes/20260802_Exporter申請案件真實API.md.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const riskLevel = searchParams.get('riskLevel')
    const search = searchParams.get('search')
    const buyerWallet = searchParams.get('buyerWallet')

    const supabase = createAdminClient()
    let query = supabase.from('cases').select('*').order('created_at', { ascending: false })
    if (stage) query = query.eq('stage', stage)
    if (riskLevel) query = query.eq('risk_level', riskLevel)
    if (search) query = query.or(`company_name.ilike.%${search}%,case_number.ilike.%${search}%`)
    if (buyerWallet) query = query.ilike('buyer_wallet', buyerWallet)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json((data as CaseRow[]).map(mapRowToCase))
  } catch (error) {
    console.error('[API] cases GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cases', code: 'CASES_FETCH_ERROR' },
      { status: 500 }
    )
  }
}

interface CreateCaseBody {
  companyName: string
  financeType: 'receivables' | 'supply_chain' | 'trade'
  amount: number
  buyerName: string
  invoiceNo?: string
  dueDate?: string
  industry?: string
  buyerCountry?: string
  exporterCountry?: string
  // Present only when the exporter already minted the invoice NFT client-side
  // with their own connected wallet (real mode) — see exporter/apply/page.tsx.
  invoiceHash?: string
  invoiceTokenId?: number
  exporterWallet?: string
  buyerWallet?: string
  chainTxHash?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateCaseBody>
    const { companyName, financeType, amount, buyerName, invoiceNo } = body
    if (!companyName || !financeType || !amount || !buyerName) {
      return NextResponse.json(
        { error: 'Missing required fields: companyName, financeType, amount, buyerName', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    const caseNumber = generateCaseNumber(companyName)
    // Real mode passes the exact hash used on-chain during mintInvoice —
    // recomputing it here could drift from what's actually registered.
    const invoiceHash = body.invoiceHash ?? keccak256(toHex(`${buyerName}:${invoiceNo ?? ''}:${amount}`))

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        company_name: companyName,
        finance_type: financeType,
        amount,
        stage: 'submitted',
        risk_level: 'medium',
        risk_score: 60,
        buyer_concentration: 0,
        invoice_hash: invoiceHash,
        is_mock: false,
        invoice_token_id: body.invoiceTokenId ?? null,
        exporter_wallet: body.exporterWallet ?? null,
        buyer_wallet: body.buyerWallet ?? null,
        chain_tx_hash: body.chainTxHash ?? null,
        buyer_name: buyerName,
        invoice_number: invoiceNo ?? null,
        due_date: body.dueDate ?? null,
        industry: body.industry ?? null,
        buyer_country: body.buyerCountry ?? null,
        exporter_country: body.exporterCountry ?? null,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json(mapRowToCase(data as CaseRow))
  } catch (error) {
    console.error('[API] cases POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create case', code: 'CASE_CREATE_ERROR' },
      { status: 500 }
    )
  }
}
