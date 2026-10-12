# 20260801_Cleanverse真實CVI與CVA整合

## 變更摘要
把「我們自己的 ComplianceRegistry 模擬 CVI」換成呼叫 Cleanverse 真實 Sandbox API(A-Pass = CVI、A-Token = CVA),讓 KYB 核發、身份驗證、以及 FinancingPool 的結算幣都串上 Cleanverse 官方服務,滿足 RWA Track「CVI 與 CVA 從發行階段就整合進核心流程」的要求。

## 背景 / 已取得的存取權限
- 已收到 Cleanverse Sandbox API 存取權限(api-id + api-key,存在 .env.local,不進 git)
- 已讀完 docs.cleanverse.com API v5.6 文件,確認 **monad 是官方支援的 chain**(`solana, base, avalanche, arbitrum, ethereum, polygon, bsc, monad, hashkey, platon`)
- Sandbox base URL:`https://uatapi.cleanverse.com/api/cooperate`

## 變更內容

### 1. CVI(A-Pass)整合 —— 對應我們的 ComplianceRegistry
- 新增 `lib/cleanverse/client.ts`:封裝 AES/CBC/PKCS5Padding(固定 16 bytes 零 IV)加解密 + api-id/api-key 呼叫邏輯
- KYB 審核通過時(目前是 admin 手動 mock 動作),改為:
  1. 呼叫 `POST /generate_apass`(customerId、identityDataList、wallet{address, chain: "monad"}、expirationTime)→ 取得真實 `cvRecordId`
  2. **同步鏡射**呼叫我們自己 `ComplianceRegistry.registerCVI()`(既有 admin-signed 邏輯不變)—— 原因見下方「決策依據」
- KYB 撤銷/凍結改呼叫 `POST /update_status`(status=2),同步呼叫我們自己的 `revokeCVI()`
- 新增查詢用 API route 呼叫 `query_apass` 顯示真實 Cleanverse 資料(tier、countries、expirationTime),取代目前 `/api/contracts/cvi/[address]` 只查我們自己合約的版本(改成兩者都顯示,或以 Cleanverse 為主)

### 2. CVA(A-Token)整合 —— 包裝 FinancingPool 的結算幣
- 用 `POST /atoken/launch` 讓 Cleanverse 發行一個真正的 A-Token(chain: monad, decimals: 6, `rule.min_tier` 設定為要求持有人必須有 CVI)取代目前 FinancingPool 建構時用的 MockUSDC
- Poll `query_apply_status` 直到 `ISSUED`,取得正式合約地址
- 用 admin_address 錢包對新 A-Token 的 minter 授予 MINTER_ROLE
- 用 `MOCK_USDC_ADDRESS` 環境變數(deploy.ts 已支援複用既有幣別位址的邏輯)指向新 A-Token 位址,重新跑 `deploy:monad` —— **這會產生一組新的 ComplianceRegistry / InvoiceAsset / FinancingPool 地址**,因為目前 deploy.ts 對這兩個合約沒有比照 stablecoin 的「已存在則複用」邏輯。是否要順便補上這段複用邏輯(只重新部署 FinancingPool)留到實作時再決定。

### 3. 環境變數(新增,填入 .env.local,由 Kenneth 自行操作)
```
CLEANVERSE_API_ID=APP20260614112550LIDZXM
CLEANVERSE_API_KEY=(sandbox key,不進 git)
CLEANVERSE_BASE_URL=https://uatapi.cleanverse.com/api/cooperate
```

## 影響範圍
- 新檔案:`lib/cleanverse/client.ts`、`lib/cleanverse/apass.ts`、`lib/cleanverse/atoken.ts`
- `app/api/admin/*`(或現有 KYB 審核相關 API route)串接 generate_apass/update_status
- `app/api/contracts/cvi/[address]/route.ts` 改為同時查 Cleanverse 與我們自己合約
- `Monsoon_contract/scripts/deploy.ts` 可能需要新增「複用既有 ComplianceRegistry/InvoiceAsset」的邏輯
- `Monsoon_contract/.env`:`MOCK_USDC_ADDRESS` 改指向 Cleanverse 發行的 A-Token
- 展示 demo 時,`/admin/contracts` 或新增一個頁面可以展示「這是 Cleanverse 真實核發的 A-Pass / A-Token,不是我們自己模擬的」

## 對應 PRD 章節
- 對應 hackathon-demo-plan.md 的 Phase D(先前因未取得 API 權限而卡住,現已解除)
- 對應 RWA Track 要求:CVI + CVA 從發行階段整合

## 決策依據
Cleanverse 的 A-Pass(身份)有自己的鏈上寫入(generate_apass 回應含 txHash),但我們自己的 InvoiceAsset/FinancingPool 合約目前是檢查**我們自己部署的** ComplianceRegistry,不是 Cleanverse 的鏈上合約 —— 文件沒有提供 Cleanverse CVI 驗證合約在 Monad 上的地址/ABI 可以讓我們的 Solidity 直接查詢。在時間有限的情況下,採用「Cleanverse API 呼叫是身份驗證的真實來源,呼叫成功後鏡射寫入我們自己的 ComplianceRegistry」這個折衷架構 —— 這正是 ComplianceRegistry.sol 原本 TODO 註解設想的路徑(「Replace admin-only registration with the Cleanverse CVI Oracle」),只是目前先用「API 呼叫觸發鏡射」而非「Oracle 直接寫我們合約」。

A-Token(CVA)是 fungible token,跟 InvoiceAsset 的 per-invoice NFT 模型不同,無法直接互換。Kenneth 確認:用 Cleanverse 發行的 A-Token 取代 FinancingPool 現用的 MockUSDC 作為結算幣,讓撥款/還款這個核心資金流動確實流過一個 Cleanverse 驗證過的資產,滿足「CVA 整合進核心流程」的精神,而不是為了湊合規格硬做一個用不到的 fungible token。
