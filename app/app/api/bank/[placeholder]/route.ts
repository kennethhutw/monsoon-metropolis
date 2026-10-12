import { NextRequest, NextResponse } from 'next/server'

// 佔位 Route — M1 開始後依需求新增 bank 專屬 API
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ placeholder: string }> }
) {
  const { placeholder } = await params
  return NextResponse.json(
    { error: `Bank API /${placeholder} is not yet implemented`, code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  )
}
