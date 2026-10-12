# Monsoon 智能合約架構說明

> 給新加入的開發者：這份文件說明 Monsoon 有哪些合約、每個合約負責什麼、彼此如何互動，
> 以及一筆應收帳款融資從頭到尾會經過哪些合約呼叫。讀完這份文件應該能看懂
> `contracts/` 底下四份 `.sol` 檔案在整個系統中的角色，不需要重新逐行讀原始碼才能上手。

---

## 1. 系統一句話

Monsoon 讓**出口商**把「已被進口商確認的應收帳款」鑄造成 NFT，抵押給銀行的融資池换取
提前撥款，到期由進口商還款、資金池自動分潤給銀行、NFT 解除抵押退還出口商。

**所有參與方的身分（能不能收 NFT、能不能被融資）都必須先通過 Cleanverse 的合規驗證
（CVI）**——這是整個系統的准入閘門，由 `ComplianceRegistry` 負責。

---

## 2. 四份合約，各自負責什麼

| 合約 | 檔案 | 一句話職責 |
|---|---|---|
| **ComplianceRegistry** | `contracts/ComplianceRegistry.sol` | 白名單／身分閘門。記錄哪個錢包通過了 CVI 驗證、驗證到什麼時候、扮演什麼角色（出口商/買方/銀行/管理員）。 |
| **InvoiceAsset** | `contracts/InvoiceAsset.sol` | 應收帳款的 NFT 化（ERC-721）。一張發票 = 一顆 NFT，帶有金額、到期日、買賣雙方、融資狀態。 |
| **FinancingPool** | `contracts/FinancingPool.sol` | 融資業務邏輯與資金池。收 NFT 當抵押品、撥款、收還款、分潤給銀行、處理違約。 |
| **MockUSDC**（測試用）／**A-Token**（正式用） | `contracts/mocks/MockUSDC.sol` | 撥款與還款用的結算貨幣（ERC-20）。正式環境用 Cleanverse 發行的 A-Token（CVA）取代，見第 6 節。 |

**依賴關係（誰認識誰）：**

```
ComplianceRegistry  ←──────────────┐
        ▲                          │
        │ 查詢白名單                │ 查詢白名單
        │                          │
  InvoiceAsset  ───────────────→ FinancingPool
   (NFT 本體)      NFT 轉入/轉出      (業務邏輯 + 資金池)
                                     │
                                     │ 轉帳
                                     ▼
                              A-Token / MockUSDC
                                (結算貨幣 ERC-20)
```

ComplianceRegistry 不認識另外兩個合約——它只是被動查詢的白名單，這是刻意設計：
合規邏輯獨立於業務邏輯，未來要接 Cleanverse 正式的 CVI Oracle 只需要換掉這一個合約
的實作，不影響 InvoiceAsset / FinancingPool。

---

## 3. ComplianceRegistry — 合規閘門

**它管的東西：**

```solidity
enum RoleType { NONE, EXPORTER, BUYER, BANK, ADMIN }

struct CVIRecord {
    bool isActive;
    uint256 issuedAt;
    uint256 expiresAt;
    string cviTokenId;      // Cleanverse A-Pass 的 token id
    bytes32 kybDataHash;    // KYB 資料的 hash（原始資料不上鏈）
    RoleType role;
}

mapping(address => CVIRecord) public cviRecords;
mapping(address => bool) public admins;
```

**誰能寫入：** 只有 `admins` 名單裡的地址（`onlyAdmin`）能呼叫 `registerCVI` /
`revokeCVI` / `renewCVI`。一般使用者的錢包完全不能自己把自己加進白名單——這對應到
App 端「CVI 申請必須經過 Admin 審核才會真正呼叫 `registerCVI`」的兩階段設計
（申請先寫進 Supabase 的 `cvi_applications` 表，Admin 按下核准後，
`app/api/admin/cvi-applications/[id]/route.ts` 才會用伺服器端的 `ADMIN_PRIVATE_KEY`
簽署這筆鏈上交易）。

**誰會讀它：** `InvoiceAsset` 和 `FinancingPool` 幾乎每個關鍵操作都會先檢查

```solidity
registry.isVerifiedAs(wallet, RoleType.EXPORTER)   // 這個錢包是否為「有效」的出口商
registry.isVerified(wallet)                        // 這個錢包是否有任一角色的有效 CVI
```

`isVerifiedAs` 同時檢查角色**和**是否過期（`expiresAt == 0` 代表永不過期，
`expiresAt > block.timestamp` 代表尚未到期）。

**TODO 標記：** 合約內留了正式版的介面設計註解
（`ICleanverseCVIOracle`），現在是「Admin 手動登記」，未來目標是換成
Cleanverse 官方的 CVI Oracle 直接寫入，不需要 Monsoon 自己的 Admin 私鑰簽署。

---

## 4. InvoiceAsset — 應收帳款 NFT

ERC-721（`ERC721Enumerable` + `ERC721URIStorage` + `Ownable`），名稱
`"Monsoon Invoice Asset"`，代號 `MINV`。每一顆 tokenId 對應一張發票：

```solidity
struct InvoiceData {
    bytes32 invoiceHash;      // 發票內容的 hash（防重複融資用）
    uint256 amount;
    uint256 issuedAt;
    uint256 dueDate;
    address exporterWallet;
    address buyerWallet;
    string cvaTokenId;        // 對應的 Cleanverse A-Token id
    bool buyerConfirmed;      // 買方是否已確認這筆應收帳款
    uint256 confirmedAt;
}

enum FinancingStatus { NONE, COLLATERALIZED, REPAID, DEFAULTED }
mapping(uint256 => FinancingStatus) public financingStatus;
mapping(bytes32 => bool) public hashExists;  // 同一張發票不能融資兩次
```

**鑄造（`mintInvoice`）**：只有通過 `RoleType.EXPORTER` 驗證的出口商能鑄造，
而且 `buyerWallet` 必須已通過 `RoleType.BUYER` 驗證，否則直接 revert。
`hashExists[invoiceHash]` 在同一筆交易內就設成 `true`，防止同一張發票被重複拿去融資
（防雙重融資的關鍵設計）。

**買方確認（`confirmReceivable`）**：只有 `buyerWallet` 本人能呼叫，這是「應收帳款轉讓通知」
（Notice of Assignment）的鏈上版本——沒有買方確認過的發票，`FinancingPool.submitCase`
會直接拒絕（見第 5 節）。

**轉帳限制（`_update` override）**：這是最容易被忽略但很重要的一段邏輯——

```solidity
function _update(address to, uint256 tokenId, address auth) internal override(...) returns (address) {
    address from = _ownerOf(tokenId);
    if (from != address(0) && to != financingPool) {
        require(financingStatus[tokenId] != FinancingStatus.COLLATERALIZED, "locked as collateral");
        require(registry.isVerified(to), "recipient must hold valid CVI");
    }
    return super._update(to, tokenId, auth);
}
```

白話翻譯：
- **鑄造**（`from == address(0)`）不受限制。
- **轉去 FinancingPool**（抵押）不受限制（否則 `submitCase` 沒辦法把 NFT 轉進資金池）。
- **除此之外的任何轉帳**：如果這顆 NFT 正被抵押中（`COLLATERALIZED`）就直接擋掉；
  收件人也必須自己先通過 CVI 驗證，否則擋掉。

只有 `FinancingPool` 能呼叫 `setCollateralized` / `setRepaid` / `setDefaulted` /
`setAvailable`（`onlyFinancingPool` modifier）——InvoiceAsset 自己不決定融資狀態，
狀態機完全由 FinancingPool 驅動。

**TODO 標記：** `cvaTokenId` 目前只是字串記錄，正式版要換成呼叫
`ICleanverseCVARegistry.verify(cvaTokenId)` 做鏈上即時驗證。

---

## 5. FinancingPool — 融資業務邏輯與資金池

`Ownable + ReentrancyGuard + IERC721Receiver`，用 `SafeERC20` 操作結算貨幣。

```solidity
enum CaseStatus { PENDING_APPROVAL, APPROVED, DISBURSED, REPAID, DEFAULTED, REJECTED }

struct FinancingCase {
    uint256 tokenId;
    address exporter;
    address buyer;
    uint256 invoiceAmount;
    uint256 advanceAmount;      // 撥款金額 = invoiceAmount * advanceRateBps / 10000
    uint256 repaymentAmount;    // 應還金額（撥款當下才算出，含利息）
    uint256 disbursedAt;
    uint256 dueDate;
    CaseStatus status;
    bytes32 ccpAuditHash;       // 銀行審核時附的稽核 hash
}

address public bankWallet;      // 部署時寫死——只有這個地址能核准/撥款
uint256 public financingRateBps;   // 年化利率（bps）
uint256 public advanceRateBps;     // 撥款成數（bps），目前 8000 = 80%
```

**一個 case 的完整生命週期**（狀態機 + 誰能觸發）：

```
submitCase (出口商)
   │  require: 出口商已驗證、擁有此 NFT、買方已確認 (isBuyerConfirmed)
   │  NFT 轉入資金池、setCollateralized
   ▼
PENDING_APPROVAL
   │
   ├─ approveCase (銀行, onlyBank)  ──▶ APPROVED
   │       附上 riskScore + ccpAuditHash（銀行端的 AI 風控 + GoPlus 錢包篩查結果都在這一步之前完成）
   │
   └─ rejectCase (銀行, onlyBank)   ──▶ REJECTED
           setAvailable + NFT 退回出口商

APPROVED
   │
   ▼
disburse (銀行, onlyBank)
   │  require: 尚未過期、資金池餘額足夠 advanceAmount
   │  算出 repaymentAmount（本金+利息）
   │  stablecoin 撥款給出口商
   ▼
DISBURSED
   │
   ├─ repay (任何人可觸發，通常是買方)  ──▶ _settle() ──▶ REPAID
   │       stablecoin 從呼叫者轉入資金池 → 轉給銀行(本金+利息)
   │       InvoiceAsset.setRepaid + NFT 退回出口商
   │
   └─ triggerDefault (銀行, onlyBank，逾期未還)  ──▶ DEFAULTED
```

**利息計算：**

```solidity
function calculateAdvanceAmount(uint256 invoiceAmount) public view returns (uint256) {
    return (invoiceAmount * advanceRateBps) / 10000;
}
function calculateRepaymentAmount(uint256 advanceAmount, uint256 tenureDays) public view returns (uint256) {
    uint256 interest = (advanceAmount * financingRateBps * tenureDays) / (10000 * 365);
    return advanceAmount + interest;
}
```

**資金池本身：** `depositLiquidity` / `withdrawLiquidity` 都是 `onlyBank`——目前只有
銀行錢包能出入資金池的本金，出口商/買方只會透過 `disburse`/`repay` 間接跟資金池互動。

**TODO 標記：** 目前結算貨幣是 MockUSDC（測試網沒有官方 USDC），正式版要換成
Monad/Base 上的真正穩定幣，並在 `disburse`/`repay` 時發出 Travel Rule 所需資料
——這正是 App 端這次新增的 Travel Rule 紀錄產生器（`app/api/travel-rule/route.ts`）
在鏈下補上的功能，還沒有做成鏈上事件。

---

## 6. 結算貨幣：MockUSDC → 真實 A-Token

`MockUSDC.sol` 很單純：

```solidity
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "mUSDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }  // 無權限限制，僅供測試
}
```

`mint` 沒有任何權限檢查，**這只能用在測試網**，正式環境絕對不能部署這份合約當結算貨幣。

Monsoon 目前在 Monad Testnet 上實際使用的結算貨幣，已經不是這份 MockUSDC，而是
透過 Cleanverse 官方流程（`atoken/launch`）真實發行的 **A-Token**（目前的 symbol
`mUSDC55RY4T`，6 位小數；2026-10-12 為配合新的 App ID 重新發行）——也就是 CVA（Cleanverse Verified Asset）本體。
`FinancingPool` 完全不知道這個差異，因為它只透過標準 `IERC20` 介面操作
`stablecoin`；換成哪一種 ERC-20 合約，對 FinancingPool 的程式碼零影響，
這也是為什麼部署腳本用一個環境變數 `MOCK_USDC_ADDRESS` 就能切換
（見第 7 節）。

---

## 7. 部署順序與接線（`scripts/deploy.ts`）

三份合約有嚴格的部署先後順序，因為建構子互相依賴地址：

```
1. ComplianceRegistry(deployer)
       — 沒有依賴，第一個部署

2. InvoiceAsset(deployer, registry.address)
       — 建構子要吃 ComplianceRegistry 地址，才能做白名單檢查

3. (視情況) 部署或沿用既有的 stablecoin
       — 有設 MOCK_USDC_ADDRESS 環境變數就沿用，否則部署新的 MockUSDC

4. FinancingPool(deployer, registry.address, invoiceAsset.address, stablecoin.address, bankWallet, financingRateBps, advanceRateBps)
       — 建構子要吃前面兩個合約地址 + 結算貨幣地址 + 銀行錢包地址
```

部署完三份合約後，還有**接線步驟**（合約部署時彼此還不知道對方，要事後手動連上）：

```
InvoiceAsset.setFinancingPool(financingPool.address)
   — 讓 InvoiceAsset 知道哪個地址是 FinancingPool，_update() 的轉帳白名單才會生效

ComplianceRegistry.setAdmin(deployer, true)
   — 讓部署者自己變成 Admin，才能後續呼叫 registerCVI 等函式

ComplianceRegistry.registerCVI(bankWallet, RoleType.BANK, "cvi-bank-genesis", zeroHash, 0)
   — 幫銀行錢包登記一筆永不過期（expiresAt=0）的創世 CVI 記錄
   — 如果 bankWallet 就是 deployer 本人，這一步會跳過
```

部署腳本最後會把地址寫進 `output/deploy_<network>_<timestamp>.txt`，
並印出可以直接貼進 `Monsoon_App/.env.local` 的四行：

```bash
NEXT_PUBLIC_COMPLIANCE_REGISTRY=0x...
NEXT_PUBLIC_INVOICE_ASSET=0x...
NEXT_PUBLIC_FINANCING_POOL=0x...
NEXT_PUBLIC_STABLECOIN=0x...
```

**目前 Monad Testnet 上的實際地址**（2026-10-12 重新部署，記錄於
`output/deploy_monadTestnet_202610121920.txt`）。Cleanverse 規定 CVA 不能用不同的
App ID 管理，所以 A-Token 改用目前的 App ID 重新發行，三份合約也跟著重新部署；
舊的部署記錄保留在 `output/` 作為歷史：

| 合約 | 地址 |
|---|---|
| ComplianceRegistry | `0xaf678a90f64a41e176ad47dd8d35458448844c18` |
| InvoiceAsset | `0x44f839d2f4127ff28e62fbf6141745b4bc2536c7` |
| FinancingPool | `0x6d05312906afe245a2ae8011b3d17b292ebd8551` |
| 結算貨幣（Cleanverse A-Token，symbol `mUSDC55RY4T`） | `0x25c92CFa4444FC1387D021e7bb5C7079f7486058` |
| 部署者 / 銀行錢包 | `0x93ff16a0dc44bc61817ede60e1c705954219877f` |

---

## 8. App 端如何跟這三份合約互動（新開發者常見疑問）

- **一般使用者操作**（mint、confirm、submitCase、approve、disburse、repay）：
  由 `Monsoon_App` 前端透過使用者自己連接的 MetaMask（`walletClient`，來自
  `hooks/useWallet.ts`）簽署，合約會用 `msg.sender` 判斷權限。
- **CVI 登記／撤銷／續期**（`registerCVI` / `revokeCVI` / `renewCVI`）：
  這些是 `onlyAdmin`，一般使用者的錢包完全簽不了。App 端用伺服器端的
  `ADMIN_PRIVATE_KEY`（`lib/contracts/real.ts` 的 `getAdminWalletClient()`）
  代替 Admin 簽署，只有在 Admin 於 `/admin/cvi-applications` 頁面按下「核准」時才會觸發。
- **查詢類函式**（`isVerified`、`isVerifiedAs`、`getCVIRecord`、`cases[id]` 等）：
  單純用 `publicClient.readContract` 讀，不需要簽名，App 各頁面（CVA 資格檢查、
  案件詳情頁）大量使用這種唯讀呼叫。

理解這個「使用者簽 vs. 伺服器 Admin 簽 vs. 純讀取」三種路徑的差別，
是看懂 `Monsoon_App/lib/contracts/real.ts` 裡每個函式在幹嘛的關鍵。

---

## 9. 快速心智圖總結

- **ComplianceRegistry** = 誰能玩這個遊戲（身分閘門，Admin 才能寫入）。
- **InvoiceAsset** = 遊戲裡的道具本體（發票 NFT），道具能不能被轉走看 ComplianceRegistry
  的臉色，也看自己有沒有正被抵押。
- **FinancingPool** = 遊戲規則本身（審核 → 撥款 → 還款 → 分潤 → 違約），
  是唯一能改變 NFT 融資狀態、唯一能動用資金池裡的結算貨幣的合約。
- **A-Token / MockUSDC** = 遊戲裡的貨幣，FinancingPool 只認得標準 ERC-20 介面，
  不在乎背後是測試幣還是 Cleanverse 正式發行的 CVA。
