// 用 Cleanverse 發行一個真正的 A-Token(CVA),取代 FinancingPool 目前用的 MockUSDC。
// 這是一次性的 bootstrap 動作,由 Kenneth 自行執行(不是 App 執行期會呼叫的程式碼)。
//
// 執行：npx tsx scripts/launch-atoken.ts
//
// 執行前請在 .env.local 填好：CLEANVERSE_API_ID / CLEANVERSE_API_KEY
// 執行後把印出來的 atokenAddress 設成 Monsoon_contract/.env 的 MOCK_USDC_ADDRESS,
// 再重新跑一次 `npm run deploy:monad`(deploy.ts 會偵測到已存在的位址並直接複用,
// 不會再部署一個新的 MockUSDC)。

import { config } from 'dotenv'
import { join } from 'node:path'
// process.cwd() (not __dirname) so this works regardless of CJS/ESM module
// resolution — run this script from the Monsoon_App directory.
config({ path: join(process.cwd(), '.env.local') })

import { launchAtoken, waitForIssuance } from '../lib/cleanverse/atoken'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'.slice(0, 42)

function isValidNonZeroAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr) && addr.toLowerCase() !== ZERO_ADDRESS.toLowerCase()
}

async function main() {
  const adminAddress = process.env.BANK_WALLET_ADDRESS ?? process.env.ADMIN_WALLET_ADDRESS
  if (!adminAddress) {
    throw new Error('請在 .env.local 設定 ADMIN_WALLET_ADDRESS(或沿用 BANK_WALLET_ADDRESS)— 這會是 A-Token 的 admin_address,之後要用它 grant MINTER_ROLE')
  }
  if (!isValidNonZeroAddress(adminAddress)) {
    throw new Error(`ADMIN_WALLET_ADDRESS 不是合法的錢包地址(收到："${adminAddress}")— 必須是 0x 開頭的 40 碼十六進位地址,且不能是零地址`)
  }

  // Cleanverse rejects a repeat submission with the same token_symbol (error
  // 12002), including after a failed prior attempt — so always mint a fresh
  // symbol per run rather than hardcoding one.
  const tokenSymbol = `mUSDC${Date.now().toString(36).toUpperCase().slice(-6)}`

  console.log(`提交 A-Token 發行申請到 Cleanverse Sandbox...(symbol: ${tokenSymbol}, admin: ${adminAddress})`)
  const { requestId } = await launchAtoken({
    chain: 'monad',
    token_name: 'Monsoon Verified Settlement USD',
    token_symbol: tokenSymbol,
    decimals: 6,
    admin_address: adminAddress,
    rule: {
      min_tier: 1, // 持有人必須有 CVI(A-Pass tier > 0)才能收/轉這個 A-Token
      is_black_list: false,
    },
    icon: 'https://images.cleanverse.com/app/token_icon/USDC.svg',
  })
  console.log(`已提交，requestId = ${requestId}`)
  console.log('等待 Cleanverse 核發（輪詢 query_apply_status）...')

  const result = await waitForIssuance(requestId)

  if (result.applyStatus !== 'ISSUED') {
    console.error(`發行失敗：${result.applyStatus}`, result.rejectReason ?? result.issueErrorMsg ?? '')
    process.exitCode = 1
    return
  }

  console.log('')
  console.log('=== A-Token 發行成功 ===')
  console.log(`合約地址: ${result.atokenAddress}`)
  console.log(`Symbol:   ${result.tokenSymbol}`)
  console.log(`Tx Hash:  ${result.txHash}`)
  console.log('')
  console.log('下一步：')
  console.log(`1. 把 MOCK_USDC_ADDRESS=${result.atokenAddress} 加進 Monsoon_contract/.env`)
  console.log('2. 重新執行 npm run deploy:monad（會複用這個位址，只重新部署合約組）')
  console.log(`3. 用 admin_address(${adminAddress})這把錢包對新 A-Token 的 minter 授予 MINTER_ROLE`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
