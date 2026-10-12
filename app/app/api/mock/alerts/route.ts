import { NextResponse } from 'next/server'
import { MOCK_ALERTS } from '@/data/mockAlerts'

export async function GET() {
  try {
    // TODO（Supabase）：替換以下 mock 為：
    // const supabase = await createClient()
    // const { data, error } = await supabase
    //   .from('alerts')
    //   .select('*')
    //   .order('created_at', { ascending: false })
    // if (error) throw error
    // return NextResponse.json(data)

    // 🔵 MOCK DATA：
    return NextResponse.json(MOCK_ALERTS)
  } catch (error) {
    console.error('[API] alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts', code: 'ALERTS_FETCH_ERROR' },
      { status: 500 }
    )
  }
}
