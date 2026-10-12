# DESIGN.md — 鏈信融資平台設計規格

> 設計權威文件。所有 UI 開發必須以本文件為準，不得自行決定顏色、間距、字體大小。  
> 設計基準來源：`blockchain_finance_platform.html`（Workspace）+ `chainfi_landing_page.html`（Landing）

---

## 1. 設計原則

| 原則 | 說明 |
|------|------|
| **資訊密度優先** | Workspace 是操作介面，不是行銷頁面。資訊緊湊、層次清晰。 |
| **淺色系為主** | 白底、米灰背景。禁止深色背景（深色主題留 Phase 2 評估）。 |
| **細邊框風格** | 使用 `0.5px solid` 邊框，不用陰影取代邊框。 |
| **語義色彩** | 顏色有意義：藍=資訊、綠=成功/低風險、橙=警告/中風險、紅=危險/高風險。 |
| **無裝飾性元素** | 不用漸層裝飾背景、不用插圖、不用圖示庫（用文字 icon 或簡單 SVG）。 |
| **中文優先** | 所有介面文字繁體中文，技術術語可中英並列。 |

---

## 2. 色彩系統（CSS 變數）

以下是完整的設計 token，直接複製到 `globals.css` 或 Tailwind config：

```css
:root {
  /* ── 背景 ── */
  --bg:    #ffffff;   /* 主背景：卡片、面板 */
  --bg2:   #f5f5f3;   /* 次背景：頁面底色、表頭 */
  --bg3:   #ededea;   /* 三級背景：進度條軌道、分隔 */

  /* ── 文字 ── */
  --txt:   #1a1a18;   /* 主文字 */
  --txt2:  #5a5a56;   /* 次文字：標籤、說明 */
  --txt3:  #9a9a96;   /* 三級文字：時間戳、佔位符 */

  /* ── 邊框 ── */
  --border:  rgba(0,0,0,0.10);   /* 主邊框（0.5px 使用） */
  --border2: rgba(0,0,0,0.18);   /* 強調邊框 */

  /* ── 資訊藍（主色） ── */
  --info-bg:  #e6f1fb;
  --info-txt: #185fa5;
  --info-bdr: #b5d4f4;

  /* ── 成功綠（低風險、核准） ── */
  --succ-bg:  #eaf3de;
  --succ-txt: #3b6d11;
  --succ-bdr: #c0dd97;

  /* ── 警告橙（中風險、注意） ── */
  --warn-bg:  #faeeda;
  --warn-txt: #854f0b;
  --warn-bdr: #fac775;

  /* ── 危險紅（高風險、錯誤） ── */
  --dang-bg:  #fcebeb;
  --dang-txt: #a32d2d;
  --dang-bdr: #f7c1c1;

  /* ── 圓角 ── */
  --radius:    8px;    /* 基礎：按鈕、輸入框、小卡片 */
  --radius-lg: 14px;   /* 大卡片、面板 */
  --radius-xl: 20px;   /* 大型容器、Modal */

  /* ── 字體 ── */
  --font: -apple-system, 'Segoe UI', sans-serif;
  --mono: 'SF Mono', 'Fira Mono', monospace;   /* 只用於 Hash、合約地址 */
}
```

### 2.1 風險顏色對應

| 風險等級 | 背景 | 文字 | 使用場景 |
|---------|------|------|---------|
| 低風險 | `--succ-bg` | `--succ-txt` | Badge、評分環、預警標注 |
| 中風險 | `--warn-bg` | `--warn-txt` | Badge、評分環、預警標注 |
| 高風險 | `--dang-bg` | `--dang-txt` | Badge、評分環、預警標注 |
| 資訊 | `--info-bg` | `--info-txt` | 主按鈕、選中狀態、連結 |

### 2.2 圖表顏色（固定，不用 CSS 變數）

```
低風險環形圖：  #2a7a45
中風險環形圖：  #d4891a
高風險環形圖：  #b53a2f
管線圖-藍：    #185fa5
管線圖-紫：    #5a5e8a
管線圖-橙：    #d4891a
管線圖-綠：    #2a7a45
AI dot：       #2a7a45（綠色，代表 AI 活躍）
```

---

## 3. Typography（字體規格）

### 3.1 字體大小層級

| 層級 | 大小 | 字重 | 用途 |
|------|------|------|------|
| 頁面標題 | `clamp(1.6rem, 3vw, 2.4rem)` | 700 | Landing 區塊標題 |
| Hero H1 | `clamp(2.4rem, 5vw, 4.2rem)` | 700 | Landing 主標題 |
| 卡片標題 | `14-15px` | 700 | 卡片 h3、面板標題 |
| 正文 | `13px` | 400 | 一般文字、說明 |
| 小標籤 | `11-12px` | 600 | sec-hd、Badge 文字 |
| 微型文字 | `10px` | 400-500 | 時間戳、欄位標籤、Chain key |
| KPI 數值 | `22px` | 600-700 | stat-val |
| 評分大數字 | `18-20px` | 700 | 風險評分環中央 |

### 3.2 字重規則

```
400 — 正文說明、次要資訊
500 — 導覽連結、稍強調文字
600 — 重要資訊、小標題、Badge
700 — 標題、KPI 數值、強調
```

### 3.3 禁止事項

- ❌ 不用 `font-weight: 800` 或 `900`（Landing 已改為 700 統一）
- ❌ 不用 `letter-spacing: -0.08em` 或更大的負值
- ❌ Hash、合約地址以外不用等寬字體

---

## 4. 間距規範

### 4.1 頁面層級

```
頁面最大寬度：    1200px（max-width + margin: 0 auto）
頁面 padding：    0 24px（左右）
區塊間距：        60px（section 上下）
卡片 gap：        10-14px
```

### 4.2 元件內部

```
stat-card padding：   14px 16px
card padding：        14px 16px
risk-card padding：   13px
ai-box body padding： 13px
nav 高度：           56px（min-height）
nav logo padding：   13px 18px
nav tab padding：    13px 16px
badge padding：      2px 8px
chip padding：       4px 10px
```

---

## 5. 元件規格

### 5.1 Nav（導覽列）

```
位置：     sticky top:0，z-index:100
背景：     --bg，border-bottom: 0.5px solid --border
高度：     56px min-height
Logo：     14-15px / 700 / 含 SVG icon（22×22）+ 品牌名稱
Tab：      12px / 500 / active 時藍色底線 2px
右側：     角色 Badge + 機構名稱（11px / --txt2）
RWD：      768px 以下隱藏 nav-links，顯示 hamburger
```

### 5.2 Badge

```css
.badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.b-blue  { background: var(--info-bg);  color: var(--info-txt); }
.b-green { background: var(--succ-bg);  color: var(--succ-txt); }
.b-warn  { background: var(--warn-bg);  color: var(--warn-txt); }
.b-red   { background: var(--dang-bg);  color: var(--dang-txt); }
```

### 5.3 Button

```
btn-primary:    background --info-txt / color white / font-weight 600
btn-secondary:  background --bg2 / border 0.5px --border2 / color --txt
btn-ghost:      background transparent / border 0.5px --border
padding:        8px 16px（一般）/ 11px（表單全寬）
border-radius:  --radius（8px）
hover:          translateY(-1px) + box-shadow
```

### 5.4 Stat Card（KPI 卡）

```
background:   --bg
border:       0.5px solid --border
border-radius: --radius（8px）
padding:      14px 16px
stat-lbl:     11px / --txt2 / margin-bottom 5px
stat-val:     22px / weight 600
stat-sub:     11px / --txt3 / margin-top 3px
Grid:         repeat(4, 1fr)，gap 10px
RWD 768px：  repeat(2, 1fr)
```

### 5.5 Card（通用卡片）

```
background:   --bg
border:       0.5px solid --border
border-radius: --radius-lg（14px）
padding:      14px 16px
```

### 5.6 AI Box

```
container:    border 0.5px --border / border-radius --radius-lg / overflow hidden
header:       background --bg2 / border-bottom 0.5px --border / padding 9px 13px / 12px / weight 600
  ai-dot：    7×7px circle / background #2a7a45 / animation pulse 2s infinite
body:         background --bg / padding 13px / 13px / line-height 1.65 / min-height 100px
footer:       background --bg2 / border-top 0.5px --border / padding 8px 10px / flex gap 6px
  chip：      11px / padding 4px 10px / border 0.5px --border2 / border-radius 12px / hover: --info-txt
```

### 5.7 Case Row（案件列表行）

```
display:       flex / align-items center / gap 10px
padding:       10px 13px
background:    --bg / border 0.5px --border / border-radius --radius
hover:         background --bg2
selected(.sel): border-color --info-bdr / background --info-bg
case-id:       11px / weight 600 / color --info-txt / min-width 90px
case-co:       13px / flex 1
case-type:     11px / --txt2 / min-width 80px
case-amt:      13px / weight 600 / min-width 90px / text-align right
```

### 5.8 Risk Bar（風險指標條）

```
row:     flex / align-items center / gap 8px / margin-bottom 7px
label:   11px / --txt2 / min-width 105px
track:   flex 1 / height 6px / background --bg3 / border-radius 3px
fill:    height 100% / border-radius 3px / transition width .4s
value:   11px / weight 600 / min-width 28px / text-align right
```

### 5.9 Chain Block（鏈上記錄）

```
container:  border 0.5px --border / border-radius --radius-lg / margin-bottom 8px
header:     background --bg2 / border-bottom 0.5px --border / padding 8px 12px / 11px / flex
  hash:     font-family --mono / 10px / color --txt3
body:       background --bg / padding 10px 12px / grid 3欄 / gap 8px
  key：     10px / --txt3 / margin-bottom 2px
  value：   12px / weight 600 / font-family --mono
```

### 5.10 Alert Item（預警項目）

```
display:  flex / gap 10px / padding 10px 12px / border-radius --radius / border 0.5px
high:     background --dang-bg / border-color --dang-bdr
med:      background --warn-bg / border-color --warn-bdr
low:      background --info-bg / border-color --info-bdr
icon:     14px / flex-shrink 0
body:     flex 1 / 12px / line-height 1.55
time:     10px / --txt3 / margin-top 3px
```

### 5.11 Flow Steps（審核流程）

```
container:  flex / align-items center / overflow-x auto
step:       flex 1 / min-width 80px / text-align center
  icon：    30×30px circle / margin 0 auto 5px
    done：  background --succ-bg / color --succ-txt
    active：background --info-bg / color --info-txt / border 2px --info-txt
    pend：  background --bg2 / color --txt3
  label：   10px / --txt2 / weight 500
connector： flex 0 0 16px / height 1px / background --border2
  done：   background --succ-txt
```

### 5.12 Score Ring（評分環）

```
SVG:         88×88px viewBox="0 0 88 88"
background:  circle r=36 / stroke --bg3（--ededea） / stroke-width 10
score arc:   circle r=36 / stroke 依評分顏色 / stroke-width 10 / stroke-linecap round
  低風險：  #2a7a45
  中風險：  #d4891a
  高風險：  #a32d2d
center text： 18px / weight 700 / --txt
```

### 5.13 Modal

```
backdrop:    fixed inset 0 / background rgba(0,0,0,0.4) / display flex center / z-index 200
container:   width min(480px,100%) / background --bg / border 0.5px --border / border-radius --radius-xl / padding 28px
close btn:   absolute right 16px top 16px / 32×32px circle / --bg2 / --border2
```

---

## 6. 頁面結構與路由

### 6.1 Landing Page（行銷頁）
**路徑：** `/`  
**特色：** 字體較大、Hero 區塊、行銷語言、較多留白

```
/ (Landing)
├── Nav（Logo + 導覽連結 + 登入按鈕）
├── Hero（主標題 + 說明 + 企業登入卡）
├── 平台功能（6個 Feature Card）
├── 六步驟融資流程
├── 即時儀表板預覽（簡化版 Dashboard）
├── 知識專欄（3篇 Blog Card）
├── CTA（行動呼籲）
└── Footer
```

### 6.2 Workspace（應用介面）
**路徑：** `/dashboard`、`/cases` 等  
**特色：** 資訊密度高、側邊欄、Tab 導覽、緊湊間距

```
/login                    # 登入頁（角色選擇）
/dashboard                # 融資概覽（銀行角色首頁）

# ── 銀行企金人員 ──
/cases                    # 案件管理（列表 + 詳情側板）
/cases/[id]               # 單一案件詳情
/risk                     # 風險引擎（AI 評分）
/chain                    # 鏈上數據
/alerts                   # 預警中心

# ── 出口商（賣方）──
/exporter/apply           # 融資申請表單
/exporter/applications    # 我的申請列表
/exporter/status/[id]     # 申請進度追蹤
/exporter/kyb             # KYB 驗證流程

# ── 進口商（買方）──
/importer/payables        # 應付帳款確認（NoA）
/importer/limits          # 信用額度使用狀況

# ── 研究員/學員 ──
/researcher               # 角色切換 + 教學模式入口

# ── Admin（管理員）──
/admin                    # Admin 首頁（系統總覽）
/admin/users              # 使用者管理（角色、權限）
/admin/thresholds         # 全域閾值設定
/admin/contracts          # 合約管理（地址、ABI 版本）
/admin/demo-data          # Mock 數據管理（切換/重置）
/admin/ai-config          # AI 設定（system prompt、模型版本）
/admin/audit-log          # 系統稽核日誌
/admin/health             # 系統健康狀態（API、Sepolia 連線）
```

---

## 7. Admin 模組規格

Admin 是獨立的角色，只有 `role: 'admin'` 可進入。

### 7.1 功能清單

| 頁面 | 功能 | 說明 |
|------|------|------|
| 系統總覽 | 健康儀表板 | API 狀態、Sepolia 連線、Claude API 剩餘額度、最後更新時間 |
| 使用者管理 | CRUD 使用者 | 新增/編輯/停用使用者，設定角色（銀行/出口商/進口商/研究員/Admin） |
| 閾值設定 | 全域風控閾值 | 買方集中度上限、逾期率紅線、單一借款人上限（同預警中心但為全域設定） |
| 合約管理 | 合約地址管理 | 顯示各合約地址（唯讀）、ABI 版本、部署時間、Sepolia Etherscan 連結 |
| Mock 數據 | 資料管理 | 切換 Demo Mode on/off、重置 Mock 數據至預設值、查看當前 Mock 數據 JSON |
| AI 設定 | 模型設定 | 查看 system prompt 內容、切換模型版本（claude-sonnet-4 等）、API 用量統計 |
| 稽核日誌 | 操作記錄 | 所有使用者操作記錄（登入、核准案件、閾值修改等），可篩選、匯出 CSV |
| 系統健康 | 監控儀表板 | API 回應時間、Sepolia 節點狀態、Claude API 錯誤率、最近 24h 錯誤日誌 |

### 7.2 Admin Nav 設計

Admin 介面有獨立的 Nav，與 Workspace 區分：

```
背景色：  --bg（同主介面，用 Badge 標注「管理員模式」）
左側：    系統 Logo +「管理員模式」紅色 Badge
頁籤：    總覽 / 使用者 / 閾值 / 合約 / Mock 數據 / AI 設定 / 稽核 / 系統健康
右側：    當前管理員名稱 + 登出按鈕
```

---

## 8. RWD 斷點規則

| 斷點 | 寬度 | 主要行為 |
|------|------|---------|
| Desktop | > 1024px | 完整版面，雙欄/四欄布局 |
| Tablet | 768px - 1024px | Hero 單欄、功能卡雙欄、指標卡雙欄 |
| Mobile | 480px - 768px | Nav 收 hamburger、全部單欄、按鈕全寬 |
| Small | < 480px | 信任卡單欄、Hero 字體縮小、CTA 無圓角 |

### 8.1 各模組斷點行為

```
stat-grid：      4欄 → 2欄（768px）→ 2欄（480px）
risk-grid：      2欄 → 1欄（768px）
two-col：        2欄 → 1欄（768px）
feature-grid：   3欄 → 2欄（1024px）→ 1欄（768px）
blog-grid：      3欄 → 2欄（1024px）→ 1欄（768px）
chain-body：     3欄 → 2欄（640px）
案件列表：       flex → scroll-x（480px 以下加 min-width）
```

---

## 9. 狀態設計規格

每個資料元件必須處理四種狀態：

### 9.1 Loading

```
使用 Skeleton（shadcn/ui Skeleton 元件）
不用 spinner / loading text
Skeleton 高度與最終內容高度一致
背景：#ededea（--bg3）/ 動畫：shimmer
```

### 9.2 Empty（無資料）

```
容器：  padding 40px / text-align center
圖示：  文字 emoji 或簡單 SVG（40px）
標題：  14px / weight 600 / --txt
說明：  13px / --txt2 / margin-top 6px
按鈕：  可選，提供建議操作（如「提交首筆申請」）
```

### 9.3 Error（錯誤）

```
背景：  --dang-bg
邊框：  0.5px --dang-bdr
圓角：  --radius
padding：12px
標題：  12px / weight 600 / --dang-txt
說明：  12px / --txt2
按鈕：  「重試」/ btn-ghost
```

### 9.4 Mock 數據標注

```
位置：  卡片左上角 / absolute
樣式：  background --info-bg / color --info-txt / 10px / weight 700
文字：  「DEMO」
顯示：  只在 NEXT_PUBLIC_DEMO_MODE=true 時顯示
```

---

## 10. 禁止事項

以下樣式決策嚴格禁止，Claude Code 不得使用：

```
❌ 深色背景（#1a1a18 等作為 body background）
❌ 霓虹色（cyan、mint green 等 landing page 原有色）
❌ 陰影替代邊框（必須同時有 border）
❌ font-weight: 800 / 900
❌ 硬編碼顏色值取代 CSS 變數（除圖表色外）
❌ any 型別（TypeScript）
❌ 直接在 HTML 元素上寫大量 inline style（超過 3 個屬性）
❌ localStorage / sessionStorage（使用 React state）
❌ 合約地址 hardcode 在元件內（必須從環境變數讀取）
❌ ANTHROPIC_API_KEY 出現在前端任何檔案
```

---

## 11. Landing vs Workspace 差異對照

| 維度 | Landing（/） | Workspace（/dashboard 等） |
|------|-------------|--------------------------|
| 目的 | 行銷、介紹、登入入口 | 操作、管理、數據監控 |
| 字體大小 | 較大（Hero H1 最大 4.2rem） | 緊湊（最大 22px KPI） |
| 留白 | 充裕（section 60px） | 緊湊（panel 20px padding） |
| 導覽 | 水平連結 + hamburger | Tab bar + 角色識別 |
| 卡片風格 | 較大圓角（20px）、有 hover lift | 小圓角（8-14px）、無 hover lift |
| 圖表 | 簡化預覽版（靜態條狀圖） | 完整互動版（SVG donut、動態 bar） |
| AI | 展示用（固定文字） | 真實 Claude API 呼叫 |

---

## 12. 圖示規範

本專案**不引入圖示庫**（節省 bundle size），使用以下方式：

```
功能圖示：   2-3字母縮寫文字（如 AI / ID / RC）+ --info-bg 方形底
狀態圖示：   Emoji（✓ ⚠️ ⚡ 🔴 🟡 🔵）
品牌圖示：   自製 SVG（僅 Logo 使用）
AI 狀態：    7×7px 綠色圓點 + pulse 動畫
鏈上狀態：   Badge 文字（「撥款」「還款」「異常偵測」）
```

---

*DESIGN.md v1.0 | chainfi-research | 2025年5月*  
*設計基準：blockchain_finance_platform.html + chainfi_landing_page.html*
