import { NextResponse, type NextRequest } from 'next/server'

// TODO（Supabase Auth）：切換 Supabase 後，改用：
// import { updateSession } from '@/lib/supabase/middleware'
// export async function middleware(request: NextRequest) {
//   return updateSession(request)
// }

// 🔵 MOCK：M0 不做 server-side 路由守衛，依賴 client-side RoleGuard
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
