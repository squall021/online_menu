# 技術決策

## 2026-11-23 有錢號和勾選框的價格

- 在解析階段處理 `$50`、全形錢號及同框的 `品名$50`，依舊保留原始 OCR 文字供校對。
- 勾選框可作為價格與備註的分隔。當加料費有 `+` 標記且勾選框後是另一個帶錢號的價格，後者作為商品單價候選。加料費仍待人工處理。

## 2026-11-23 中杯與大杯計價

- `priceMode` 記錄商品使用 `single` 或 `sizes`。單價沿用 `price`。M／L 各自的價格保存在 `optionGroups` 的 `size` 群組，兩個價格都需大於零才能確認。
- 遷移舊資料時，已有有效單價的商品沿用單價模式。沒有單價的雙價 OCR 候選開啟雙價欄位，僅預填帶明確 M／L 標記的價格。價格或模式更動後重新確認。
- 購物車依商品、杯型、單價各自計數。測試訂單保存 `size` 與當時單價，統計依品名、杯型及單價分組。CSV 在原欄位末尾新增「杯型」，既有訂單該欄為空。

## 2026-11-23 GitHub Pages 測試站

- 以 `main` 作為程式來源。GitHub Actions 使用 Node.js 24 和 npm lockfile 建置，依 GitHub Pages 設定取得 Vite 的 `BASE_PATH`，將 `dist/` 發布至 `/online_menu/`。
- GitHub Pages 提供手機測試入口。菜單草稿和測試訂單仍由各瀏覽器儲存，跨裝置共用留待後端階段。 [部署工作流程](.github/workflows/pages.yml)

## 2026-11-23 瀏覽器 OCR 與模型

- 保留官方 `@paddleocr/paddleocr-js` 0.4.2 的 `create`／`predict`，使用 `lang: 'ch'` 的 PP-OCRv5 mobile det／rec，單執行緒 WASM。測試在標準本機 HTTP 環境執行，在目前 Vite 設定下可用。
- 固定同一份 ONNX Runtime Web 1.31.1 並留下 npm lockfile。透過 Vite 的 `?url` 指定 JSEP WASM 檔。開發版的依賴預打包會改變執行模組位置，原本的相對 URL 會收到 Vite 的 HTML。明確的資產 URL 同時適用於 Vite 子路徑建置。
- 按下辨識才載入 OCR SDK，校對、點餐和統計可先使用。模型保留 SDK 官方下載來源。本機 Chrome 已驗證模型回應包含允許目前來源的 CORS 標頭。第一次下載依賴網路，兩個模型合計 21,544,960 bytes。
- 原始匯出保留 SDK 的 `items` 與 `metrics`，另產生帶 `index` 的 `lines` 供解析與核對。手工對照資料放在測試證據目錄，產品程式只使用當次 OCR 輸出。

## 2026-11-23 價格與規格資料

- `price` 是 V1 點餐表單的正整數單價。價格未確定、無法讀取或有多個候選時用 `null`。 `priceCandidates` 留存 OCR 價格及明確辨識到的尺寸文字，`ocrItemIndexes` 可回查來源框。由相鄰數字推得的雙價保留左右順序。
- 商品增加 `optionGroups` 陣列；舊商品缺欄時補空陣列。群組有 `type`、`label` 與 `options`。當 OCR 明確讀到 M／L，尺寸群組預填辨識到的 `label` 與 `price`，隨商品一起人工校對。後續可用 `size`、`topping`、`sweetness`、`ice` 分別表達尺寸、加料、甜度與冰量，再補選擇規則及加價欄。
- 全部商品都有效且經確認後才能預覽或送單。任何商品欄位更動都會取消該筆確認。
- 既有本機測試流程沿用原有儲存方式。後續在共享版加入團購場次、服務端權限、結單與價格快照。
