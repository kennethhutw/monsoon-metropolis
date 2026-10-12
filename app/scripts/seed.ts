// 初始化系統資料
// 執行：npx tsx scripts/seed.ts

// TODO（Supabase）：切換 Supabase 後，此 script 改為：
// 1. supabase.auth.admin.createUser({ email, password, user_metadata: { role, name, organization } })
// 2. 建立初始 cases、alerts、thresholds 資料

import { MOCK_USERS } from '../data/mockUsers'

async function seed() {
  console.log('🌱 Seeding monsoon-app...')
  console.log('')
  console.log('📋 Demo 帳號清單：')
  console.log('─────────────────────────────────────────────')

  MOCK_USERS.forEach(u => {
    console.log(`  ${u.role.padEnd(12)} ${u.email.padEnd(32)} ${u.password}`)
  })

  console.log('─────────────────────────────────────────────')
  console.log('')
  console.log('✅ Seed 完成！')
  console.log('')
  console.log('🚀 啟動開發伺服器：')
  console.log('   npx next dev')
  console.log('')
  console.log('🔑 第一次登入建議使用 Admin 帳號：')
  console.log('   Email：admin@monsoon.demo')
  console.log('   密碼：admin5678')
}

seed().catch(console.error)
