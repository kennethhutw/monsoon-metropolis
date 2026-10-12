import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ERC-721 metadata for a minted invoice NFT. See
// docs/changes/20260806_發票NFT動態圖片.md — falls back to generic metadata
// on any lookup failure so a broken DB call never breaks tokenURI resolution.

function defaultMetadata(imageUrl: string) {
  return {
    name: 'Monsoon Invoice NFT',
    description: 'Tokenized trade receivable on Monsoon, verified via Cleanverse CVI.',
    image: imageUrl,
    attributes: [],
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ invoiceHash: string }> }) {
  const { invoiceHash } = await params
  const imageUrl = `${request.nextUrl.origin}/api/nft-image/${invoiceHash}`

  try {
    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('cases')
      .select('case_number, company_name, buyer_name, invoice_number, amount, due_date, finance_type')
      .eq('invoice_hash', invoiceHash)
      .maybeSingle()

    if (!row) return NextResponse.json(defaultMetadata(imageUrl))

    return NextResponse.json({
      name: `Monsoon Invoice — ${row.invoice_number ?? row.case_number}`,
      description: `Tokenized trade receivable on Monsoon. Exporter: ${row.company_name}. Amount: $${Number(row.amount).toLocaleString()}.`,
      image: imageUrl,
      attributes: [
        { trait_type: 'Finance Type', value: row.finance_type },
        { trait_type: 'Amount (USD)', value: Number(row.amount) },
        { trait_type: 'Buyer', value: row.buyer_name ?? 'Unknown' },
        { trait_type: 'Due Date', value: row.due_date ?? 'Unknown' },
      ],
    })
  } catch (error) {
    console.error('[nft-metadata] lookup failed, using default metadata:', error)
    return NextResponse.json(defaultMetadata(imageUrl))
  }
}
