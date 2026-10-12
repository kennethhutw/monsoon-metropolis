# Real 模式端到端測試指南

測試對象:`exporter apply(mint) → importer 確認收款 → exporter 送出融資 → bank 核准/撥款 → importer 還款` 整條真實鏈上簽署流程,加上這幾天新增的 CVI/CVA 驗證、AML 錢包篩查、Travel Rule 合規紀錄、Admin 管理功能。

> PowerShell 設定環境變數語法:`$env:VAR="value"`(跟 bash 的 `VAR=value cmd` 不一樣)

---

## Phase 0 — 環境準備

1. `Monsoon_App/.env.local`:確認 `NEXT_PUBLIC_CONTRACT_MODE=real`,四個合約地址(`NEXT_PUBLIC_COMPLIANCE_REGISTRY` / `NEXT_PUBLIC_INVOICE_ASSET` / `NEXT_PUBLIC_FINANCING_POOL` / `NEXT_PUBLIC_STABLECOIN`)跟最新的 `Monsoon_contract/output/deploy_monadTestnet_*.txt` 一致。同時確認這幾個也都有設:`ADMIN_PRIVATE_KEY`、`AI_PROVIDER`(+ `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`)、`EXA_API_KEY`、`GOPLUS_API_KEY`、`GOPLUS_API_SECRET`。

2. MetaMask 加入 Monad Testnet:
   - Chain ID: `10143`
   - RPC: `https://testnet-rpc.monad.xyz/`
   - Symbol: `MON`
   - Explorer: `https://testnet.monadexplorer.com`

3. 準備 **3 個帳戶**:
   - **Bank**:直接把部署合約用的那把私鑰(`Monsoon_contract/.env` 的 `DEPLOYER_PRIVATE_KEY`,應該跟 `ADMIN_PRIVATE_KEY` 是同一把)匯入 MetaMask —— 這不是可選的,`FinancingPool.bankWallet` 在部署時就寫死是這個地址,用別的錢包按 Approve/Disburse 會直接 revert。
   - **Exporter**、**Importer**:MetaMask 新建 2 個帳戶即可。
   - 三個帳戶都要有一點測試網 MON 當 gas(用你之前部署合約時用過的同一個水龍頭)。

**✅ 驗證**:MetaMask 網路選單看得到 "Monad Testnet",三個帳戶餘額都 > 0 MON。

---

## Phase 1 — 幫 Exporter / Importer 錢包做 CVI 與資金準備

在 `Monsoon_contract/.env` 加入:

```
EXPORTER_WALLET_ADDRESS=0x_EXPORTER_地址
BUYER_WALLET_ADDRESS=0x_IMPORTER_地址
```

然後直接執行(不用再設 PowerShell 環境變數,script 會自己讀 `.env`):

```powershell
npm run onboard:exporter
```

```powershell
npm run onboard:buyer
```

這兩支 script 都會:幫錢包註冊真實 Cleanverse A-Pass → 註冊我們自己 `ComplianceRegistry` 的 CVI(角色由指令本身決定,`onboard:exporter` 固定是 EXPORTER、`onboard:buyer` 固定是 BUYER)。`onboard:buyer` 額外多鑄 5,000 mUSDC 給該錢包,之後才有錢還款。

**✅ 驗證**:兩次都看到最後印出 `✅ 0x... is ready to use as the ... wallet.`,沒有任何 revert 錯誤。

---

## Phase 2 — 確認 CVI / CVA / 錢包安全驗證頁面(新)

1. 登入 **Exporter**,Connect Wallet(Exporter 帳戶)→ 前往 `/exporter/kyb`
2. 登入 **Importer**,Connect Wallet(Importer 帳戶)→ 前往 `/importer/kyb`(側邊欄叫「Verification」)

**✅ 驗證**(兩邊都要看):
- 「Cleanverse A-Pass (CVI) — Live Sandbox」面板顯示 Active,CV Record ID 有值
- 「Verified on-chain」綠色徽章
- 「A-Token Settlement Eligibility (CVA)」卡片顯示綠色「Eligible to receive/transfer CVA settlement funds」(因為 Phase 1 已經註冊過 CVI,理論上直接合格,不用走申請流程)
- 「Your Wallet」錢包安全卡片(GoPlus)顯示綠色「No risk flags found」+ 「Powered by GoPlus Security」
- 側邊欄「KYB Verification」/「Verification」連結**不會**變橘色(因為已合格);左上角 Connect Wallet 藥丸也維持綠色

---

## Phase 3 — 自助 CVI 申請 + Admin 審核流程(新,選測)

這條路是給**還沒跑過 onboard script 的新錢包**用的替代驗證管道,想展示「不合格 → 申請 → admin 審核 → 核准」完整故事的話才需要測。可以用 MetaMask 再新建一個第 4 個帳戶(不要用 Exporter/Importer 帳戶,那兩個已經合格了,測不出「不合格」的畫面)。

1. 用這個新帳戶 Connect Wallet,前往 `/exporter/kyb`(或 `/importer/kyb`)
2. 應該看到「No active CVI found for this wallet」+ CVA 卡片顯示紅色「Not eligible」+「Apply for CVI Verification」按鈕
3. 按下去 → 卡片變成「Application under review since …」
4. 登入 **Admin**,前往 `/admin/cvi-applications`
5. 「Pending Review」應該看到剛剛那筆申請,按 **Approve**

**✅ 驗證**:
- Admin 端 toast「CVI issued」,該筆移到「Reviewed」清單,狀態 approved,有 tx hash 可以點 View
- 回到 Exporter/Importer 那個新帳戶的頁面重新整理,CVA 卡片應該變綠色「Eligible」
- `/admin` Dashboard 的「Recent Admin Activity」應該看得到這筆 `approve cvi application` 紀錄

---

## Phase 4 — Exporter:Mint 發票 NFT

1. 打開 App,登入 **Exporter** demo 帳號
2. 點導覽列的 **Connect Wallet**,MetaMask 彈窗選 **Exporter** 帳戶並核准
3. 確認按鈕變成綠點 + 錢包地址(不是「Switch to Monad Testnet」的橘色警告,也不是橘色的「未驗證」警示)
4. 前往 `/exporter/apply`,填寫金額,第二步除了 Buyer Company Name,**Buyer Wallet Address 填 Importer 帳戶的地址**
5. 按 Submit Application → MetaMask 跳出**一次**簽署請求(mintInvoice)→ 核准

**✅ 驗證**:
- 出現「Application Submitted」畫面 + 真實案號
- MetaMask 活動紀錄裡看得到這筆交易
- 到 [Monad Explorer](https://testnet.monadexplorer.com) 貼 Exporter 錢包地址,看得到這筆 `mintInvoice` 交易

---

## Phase 5 — Importer:確認收款(Confirm Receivable)

1. 登出,登入 **Importer** demo 帳號
2. **在 MetaMask 裡把目前帳戶切成 Importer**(跟剛剛填的 Buyer Wallet Address 要是同一個),回到網頁點 Connect Wallet 讓它抓到新帳戶
3. 前往 `/importer/payables`,應該會看到「**Pending Confirmation**」區塊,列出剛剛那張發票
4. 按 **Confirm Receivable** → MetaMask 跳出簽署請求 → 核准

**✅ 驗證**:
- Toast 顯示「Receivable confirmed」
- 該筆從 Pending Confirmation 清單消失(代表 `isBuyerConfirmed` 已經是 true)

---

## Phase 6 — Exporter:送出融資申請

1. 登出,登入回 **Exporter**,MetaMask 切回 Exporter 帳戶,重新 Connect Wallet
2. 前往 `/exporter/status/{案號}`(可以從 `/exporter/applications` 點進去)
3. 頁面應顯示「Submit for Financing」按鈕(代表偵測到買方已確認)
4. 按下去 → **MetaMask 會跳兩次**:第一次是 `approve`(把 NFT 授權給 FinancingPool),第二次是 `submitCase` → 都核准

**✅ 驗證**:
- Toast 顯示「Submitted for financing」+ FinancingPool case 編號
- 頁面 Review Progress 進度條走到「AI Review」
- 登入 Bank 帳號,`/bank/cases` 應該看得到這筆案件

---

## Phase 7 — Bank:核准 + 撥款(含 AML 錢包篩查閘門)

1. 登入 **Bank** demo 帳號,MetaMask 切到 **Bank(deployer)帳戶**,Connect Wallet
2. 前往該案件的 `/bank/cases/{案號}`(列表頁點 Full Page)
3. Approve Application 按鈕上方應該先看到兩張「Exporter Wallet」「Buyer Wallet」錢包安全卡片(GoPlus 篩查,自動觸發,不用手動按),都要顯示綠色「No risk flags found」**Approve 按鈕才會變成可以按**(灰掉代表還在檢查中或真的命中風險旗標)
4. 按 **Approve Application** → MetaMask 跳出 `approveCase` 簽署 → 核准
5. 畫面應該換成 **Disburse Funds** 按鈕 → 按下去 → MetaMask 跳出 `disburse` 簽署 → 核准

**✅ 驗證**:
- 核准後 toast「Case approved on-chain」,畫面出現 Disburse 按鈕(代表讀到鏈上狀態變成 APPROVED)
- 撥款後 toast「Funds disbursed」
- 用 Monad Explorer 查 **Exporter 錢包**,mUSDC 餘額應該增加(發票金額的 80%,即 advance amount)。MetaMask 預設不會自動顯示 mUSDC 餘額,需要手動「Import Token」貼 `NEXT_PUBLIC_STABLECOIN` 地址才看得到
- 頁面下方應該出現新的「**Travel Rule Compliance**」卡片,一筆 Disbursement 紀錄,Beneficiary 是 Exporter,CVI verified,金額如果 ≥ US$1,000 會顯示「Threshold applicable」

---

## Phase 8 — Importer:還款

1. 登入 **Importer**,MetaMask 切回 Importer 帳戶,Connect Wallet
2. 前往 `/importer/payables`,「**Ready to Repay**」區塊應該顯示這筆案件跟確切還款金額(本金 + 依天數算的利息)
3. 按 **Repay** → 如果 mUSDC allowance 不夠,MetaMask 會先跳 `approve`,再跳 `repay`(可能各一次,共一或兩次簽署)

**✅ 驗證**:
- Toast「Repayment complete」
- 該案件從 Ready to Repay 清單消失
- 回到 Bank 的案件詳情頁重新整理,應顯示「Case settled — repaid in full」
- 「Travel Rule Compliance」卡片應該多一筆 Repayment 紀錄,Originator 是 Buyer
- 到 Monad Explorer 查 **Exporter 錢包的 NFT**,發票 NFT 應該已經轉回 exporter 手上(FinancingPool 釋放了抵押品)

---

## Phase 9 — Admin 功能確認(新)

登入 **Admin**,依序檢查:

1. `/admin`(Platform Overview)—— Stat 卡片是真實數字、Stuck Cases / High-Risk Companies 清單有資料、Smart Contracts 地址卡片、Recent Admin Activity 有紀錄
2. `/admin/users` —— 5 個 demo 帳號都在,Edit 可以改資料,demo 帳號的 Reset Password 應該不能按(顯示 Demo 鎖頭圖示)
3. 點任一使用者進 `/admin/users/{id}` —— 如果有設 Wallet Address,應該看到「Cases Submitted」列出跟這個錢包相關的案件
4. `/admin/cvi-applications` —— Phase 3 如果測過,這裡看得到那筆審核紀錄
5. `/bank/cases` —— 案件清單有「Stuck」徽章(卡住 3 天以上的案件),右側詳情面板看得到 Exporter/Buyer Wallet

**✅ 驗證**:上述每一項畫面都有資料、沒有空白頁或錯誤訊息。

---

## 常見錯誤

- 任何一步在 MetaMask 確認後失敗、錯誤是類似 `0xa6725971` 這種看不懂的 custom error 選擇器 —— 幾乎都是**收款方或發送方沒有 CVI / A-Pass**,回去確認 Phase 1 的 `onboard:exporter` / `onboard:buyer` 有沒有真的對兩個錢包都跑過,或者查一下該地址在 Cleanverse 是否已有 A-Pass(可以用之前查銀行錢包的同一招,打 `query_apass`)。
- Approve 按鈕一直是灰的按不下去 —— 檢查 Phase 7 步驟 3 的兩張 GoPlus 錢包安全卡片是不是卡在「Screening unavailable」以外的狀態;技術性查不到不會擋,只有「Loading 中」或「真的命中風險旗標」才會擋。
- `/admin/cvi-applications` 的 Approve 按下去報錯 `ADMIN_PRIVATE_KEY is not set` —— `.env.local` 沒設這個變數,補上部署者私鑰後重啟 server。
- 空白頁、什麼都沒顯示 —— 先確認左上角 Connect Wallet 藥丸看到的是不是自己以為的帳戶,登入角色跟 MetaMask 帳戶是兩件獨立的事,常常是切錯 MetaMask 帳戶。
