# 團購點餐系統開發規範

- 先讀取 `PROJECT_HANDOFF.md`、`README.md` 和 `DECISIONS.md`，依現有模組的職責修改。沿用 HTML、CSS、JavaScript 和 Vite；保留手機與桌面操作流程。
- 一般點餐者免登入，只需填姓名。LINE 維持手動分享網址。共享訂單規劃使用 GitHub Pages、Google Apps Script 與 Google Sheets。前端只放可公開的設定。
- 使用免費開源的 PaddleOCR。保留原始文字、位置、信心及辨識來源。範例圖片可走同一套辨識流程，測試基準與模擬資料只作為開發驗證。
- OCR 商品一律先進入人工校對。價格不確定時保留 `null` 並顯示「待確認」。任何點餐入口都要驗證品名、正整數單價與人工確認狀態。
- 保留舊版菜單 JSON 和本機訂單的相容性。調整資料結構時，確認讀入既有資料、重新匯出和後續統計。
- 修改依賴、模型、解析、核對或點餐流程後，執行必要測試。涉及 OCR 時使用 `public/samples/taotao.jpg` 和 `public/samples/50lan.jpg` 實測，分開記錄原始辨識與候選配對，並註明未測項目。
- 重要變更同步更新 `PROJECT_HANDOFF.md`、`DECISIONS.md`、`CHANGELOG.md`。涉及可重現的 OCR 結果時更新 `docs/OCR_TEST_REPORT.md` 和對應證據。
