# 20260808_AI助理面板ComingSoon

## 變更摘要

在所有已登入角色的 workspace 頁面（bank / exporter / importer / researcher / admin，不含行銷首頁跟 `/login`）右側加一個可展開的 AI 助理面板 UI，純畫面、不接任何後端功能，明確標示「Coming Soon」。

## 變更內容

- 新增共用元件 `components/shared/AiAssistantPanel.tsx`:
  - 預設收合成螢幕右側邊緣的一個直立小標籤/按鈕(例如寫著「AI Assistant」+ 一個 icon)
  - 點擊展開成右側滑入的面板,面板內:標題「AI Assistant」+ 明顯的「Coming Soon」徽章、一段說明文字(例如「Ask questions about your cases, risk scores, and compliance status — coming soon.」)、一個**disabled** 的輸入框 + disabled 的送出按鈕(視覺上是輸入框的樣子,但不能真的打字/送出,避免被誤會成壞掉的功能)
  - 純 client component,不呼叫任何 API,沒有 loading/error 狀態要處理(因為沒有資料要抓)
- 在五個角色的 `layout.tsx`(`app/bank/layout.tsx`、`app/exporter/layout.tsx`、`app/importer/layout.tsx`、`app/researcher/layout.tsx`、`app/admin/layout.tsx`)裡,`RoleGuard` 包起來的範圍內加一行 `<AiAssistantPanel />`,跟 `<Nav />` 同一層。這樣行銷首頁、`/login` 不會出現這個面板,只有登入後的 workspace 才有。

## 影響範圍

- 新檔案:`components/shared/AiAssistantPanel.tsx`
- 修改:五個角色的 `app/*/layout.tsx`(各加一行)
- 不影響任何 API route、資料庫、合約互動

## 對應 PRD 章節

- 無對應章節,是這次 hackathon 衝刺期間新增的 UI-only 展示用元件(暗示產品路線圖,不是功能承諾)

## 決策依據

- 一開始討論的是「(admin) 右側加 AI 對話框」,Kenneth 之後確認範圍要擴大到「不只 admin,用戶端(bank/exporter/importer/researcher)也要」。
- 明確選擇「只做 UI、標 Coming Soon、不接功能」而不是做出真的能問答的 AI 面板:時間在 48 小時衝刺內很緊,而且这個功能跟評分權重最高的 CVI/CVA Integration 沒有直接關係,做成真功能的時間效益不高。純 UI 版本風險趨近於零、成本很低,又能在 demo 裡暗示產品的延伸路線圖(跟 Scalability Potential 稍微沾邊)。
- disabled 輸入框而不是完全靜態的圖片/文字,是為了讓面板「看起來是真的產品裡預留的位置」,但同時透過 disabled 狀態 + Coming Soon 徽章明確告訴使用者這不是壞掉,是刻意還沒開放。
