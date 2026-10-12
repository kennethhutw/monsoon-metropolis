import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Dynamic invoice-NFT artwork. Looks up the case by invoice_hash (unique,
// known client-side before mint — see exporter/apply/page.tsx) and bakes its
// details into an SVG. Any lookup failure falls back to a generic card
// instead of erroring, since wallets/explorers treat a broken image URL far
// worse than a plain placeholder. See docs/changes/20260806_發票NFT動態圖片.md

const PRIMARY = '#004782'

interface InvoiceCardData {
  companyName: string
  buyerName?: string
  invoiceNumber?: string
  amount: number
  dueDate?: string
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' } as Record<string, string>
  )[c] ?? c)
}

function buildSvg(data: InvoiceCardData | null): string {
  const rows: [string, string][] = data
    ? [
        ['Exporter', data.companyName],
        ['Buyer', data.buyerName ?? '—'],
        ['Invoice No.', data.invoiceNumber ?? '—'],
        ['Amount', `$${data.amount.toLocaleString()}`],
        ['Due Date', data.dueDate ? new Date(data.dueDate).toLocaleDateString() : '—'],
      ]
    : []

  const rowsSvg = rows
    .map(
      ([label, value], i) => `
      <text x="40" y="${180 + i * 34}" font-family="monospace" font-size="12" letter-spacing="1" fill="#9fb8cc">${escapeXml(label.toUpperCase())}</text>
      <text x="40" y="${198 + i * 34}" font-family="sans-serif" font-size="16" font-weight="600" fill="#ffffff">${escapeXml(value)}</text>`
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="#001f38"/>
    </linearGradient>
  </defs>
  <rect width="600" height="400" rx="20" fill="url(#bg)"/>
  <text x="40" y="60" font-family="sans-serif" font-size="26" font-weight="700" fill="#ffffff">Monsoon</text>
  <text x="40" y="84" font-family="monospace" font-size="13" letter-spacing="2" fill="#9fb8cc">TRADE RECEIVABLE INVOICE NFT</text>
  <line x1="40" y1="104" x2="560" y2="104" stroke="#2d5f8a" stroke-width="1"/>
  ${data ? rowsSvg : '<text x="40" y="200" font-family="sans-serif" font-size="16" fill="#9fb8cc">Processing…</text>'}
  <text x="40" y="368" font-family="monospace" font-size="11" fill="#6d93b3">Monad Testnet · Verified via Cleanverse CVI</text>
</svg>`
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ invoiceHash: string }> }) {
  const { invoiceHash } = await params
  let data: InvoiceCardData | null = null

  try {
    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('cases')
      .select('company_name, buyer_name, invoice_number, amount, due_date')
      .eq('invoice_hash', invoiceHash)
      .maybeSingle()
    if (row) {
      data = {
        companyName: row.company_name,
        buyerName: row.buyer_name ?? undefined,
        invoiceNumber: row.invoice_number ?? undefined,
        amount: Number(row.amount),
        dueDate: row.due_date ?? undefined,
      }
    }
  } catch (error) {
    console.error('[nft-image] lookup failed, using default SVG:', error)
  }

  return new NextResponse(buildSvg(data), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
