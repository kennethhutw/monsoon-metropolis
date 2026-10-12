import { NextRequest, NextResponse } from 'next/server'
import { MOCK_RISK_PROFILES } from '@/data/mockRisk'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params

    // TODO（Supabase）：替換以下 mock 為：
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('risk_profiles')
    //   .select('*')
    //   .eq('company_id', companyId)
    //   .single()
    // if (error) throw error
    // return NextResponse.json(data)

    // 🔵 MOCK DATA：
    const profile = MOCK_RISK_PROFILES[companyId]
    if (!profile) {
      return NextResponse.json(
        { error: 'Risk profile not found', code: 'RISK_PROFILE_NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('[API] risk error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch risk profile', code: 'RISK_FETCH_ERROR' },
      { status: 500 }
    )
  }
}
