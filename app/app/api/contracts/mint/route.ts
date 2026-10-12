import { NextRequest, NextResponse } from 'next/server'
import { contracts } from '@/lib/contracts'

// InvoiceAsset.mintInvoice requires the exporter's own wallet signature
// (msg.sender becomes the invoice's exporterWallet) — a shared backend key
// cannot call this without misrepresenting who signed. Works in mock mode;
// in real mode this surfaces a clear "pending wallet-connect UI" error until
// Phase B ships.
export async function POST(_request: NextRequest) {
  try {
    const result = await contracts.mintInvoice()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] mint error:', error)
    const message = error instanceof Error ? error.message : 'Mint failed'
    return NextResponse.json({ error: message, code: 'MINT_ERROR' }, { status: 500 })
  }
}
