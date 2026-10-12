# 20261013_建立monsoon-metropolis單一repo

## 變更摘要
Metropolis hackathon 要求單一 repo。建立新 repo `monsoon-metropolis`，把 App 放在 `/app`、合約放在 `/contracts`，根目錄放總覽 `README.md`。

## 變更內容
- 新 repo 由 `Monsoon_App`（不含 `.git`、`node_modules`、`.next`、`.env.local`、`.env.local.bak`、建置產物）與 `monsoon-contract`（不含 `.git`、`node_modules`、`artifacts`、`cache`、`.env`）複製而來
- 新增根目錄 `README.md`：專案總覽、目錄結構、合約地址，以及說明線上網站仍由原 `monsoon-app` repo 部署、合約原始開發於 `monsoon-contract`、完整提交歷史在那兩個 repo
- `app/README.md`、`contracts/README.md` 內的跨 repo 連結改為相對路徑
- 程式碼內容與原 repo 一致，**不修改**；`CLAUDE.md`、`docs/DESIGN.md`、既有 `docs/changes/` 原樣複製

## 影響範圍
- 僅新增新 repo；原 `monsoon-app`、`monsoon-contract` 與 Vercel 設定不動，線上網站仍從 `monsoon-app` 部署
- 截止前若再修改程式碼，需同時更新兩邊，避免新 repo 與線上版本不一致

## 對應 PRD 章節
- 不對應 `Monsoon_App_PRD.md`，屬於提交用的 repo 結構

## 決策依據
- 避免變更 Vercel 設定的風險；新 repo 放真實程式碼（不是只放連結），評審可直接複製與執行
- 在根目錄 README 揭露程式碼來源與歷史所在，保持透明
