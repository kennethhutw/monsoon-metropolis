# 20260809_新增GoogleAnalytics追蹤

## 變更摘要
在 app 全站加入 Google Analytics 4(GA4)追蹤,Measurement ID 為 `G-405139335`。

## 變更內容
- 新增依賴 `@next/third-parties`(Next.js 官方套件,封裝 gtag.js,對 Core Web Vitals 影響最小)
- `app/layout.tsx` 的 `<body>` 內加入 `<GoogleAnalytics gaId="G-405139335" />`
- ID 直接寫死在程式碼裡(不透過環境變數)——GA4 Measurement ID 本來就是客戶端可見的公開值,不是密鑰,不受 CLAUDE.md 規則 2(API Key 規則)限制

## 影響範圍
- `package.json`(新增一個依賴)
- `app/layout.tsx`(加入追蹤元件,所有頁面共用同一個 root layout,不需要每個角色頁面各別加)

## 對應 PRD 章節
- 無新增頁面/角色權限異動,純粹是可觀測性(analytics)追蹤

## 決策依據
Kenneth 要求加入 Google Analytics(ID: 405139335),已確認格式為 GA4 Measurement ID `G-405139335`。用 Next.js 官方 `@next/third-parties/google` 而非手刻 `<script>` 標籤,因為它會自動處理 `next/script` 的載入策略(`afterInteractive`),避免阻塞頁面渲染或跟 Next.js 的 hydration 打架。
