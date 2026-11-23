# 團購點餐系統交接

更新日期 2026-11-23。V1 可辨識菜單、校對、試點及統計。遠端測試版由 GitHub Actions 建置並發布到 GitHub Pages。 [測試網址](https://squall021.github.io/online_menu/)

## 產品需求

發起人上傳菜單並確認品名、規格和價格。同事免登入，僅填姓名即可點餐。發起人可查閱個別訂單及交給店家的品項彙總。LINE 可用來手動分享網址。預計以 GitHub Pages 提供前端，Google Apps Script 和 Google Sheets 處理共享訂單。

## 目前架構

| 檔案 | 職責 |
|---|---|
| `index.html`、`src/main.js`、`src/style.css` | Vite 入口、頁籤切換、圖片與 OCR 結果介面、響應式樣式 |
| `src/ocr.js` | 按需初始化官方 PaddleOCR.js，以 PP-OCRv5、單執行緒 WASM 辨識；保留模型資訊、文字、分數與原圖座標 |
| `src/menu-parser.js`、`src/menu.js` | 從文字和座標建立候選商品，區分單價、雙價、待確認價格，保留規格欄位並驗證可點餐狀態 |
| `src/menu-editor.js` | 新增、刪除、修改與逐項確認；匯入及匯出菜單 JSON |
| `src/order-form.js`、`src/order-stats.js` | 姓名、數量、備註、單價快照、依姓名／品項統計、CSV 匯出 |
| `src/dom.js` | 共用 DOM 查詢、文字跳脫、識別碼和檔案下載 |

未確認或缺少有效價格時，點餐預覽和送單會一起被擋下。修改商品品名、價格或分類後，該筆必須重新確認。雙價候選的可訂購單價留空，保留 OCR 價格供核對。V1 可手動將不同尺寸分列。既有的本機菜單和訂單仍使用原本的三個 `localStorage` 鍵。

## 本輪實測

- Node.js 26.13.0、npm 11.20.0、Vite 7.3.8。安裝、開發伺服器、根路徑建置及 `/menu-ocr-v1/` 建置皆通過。
- PaddleOCR.js 0.4.2 與 ONNX Runtime Web 1.31.1 固定版本。原 Vite 開發模式的 WASM 請求會收到 HTML，現由 Vite 明確解析相符的 WASM 資產。
- Chrome 與 Edge 實際辨識先喝道與 50嵐，分別輸出 169、279 段文字。逐項核對、原始 JSON、座標及價格錯誤例見 [OCR 測試報告](docs/OCR_TEST_REPORT.md)。
- GitHub Pages 公開站以 412 CSS px 手機模擬完成兩張菜單 OCR，確認範例圖片、同源 WASM 與 Paddle 官方模型的 CORS。 [首次部署紀錄](https://github.com/squall021/online_menu/actions/runs/45131306377)
- 點餐與訂單仍儲存在當前瀏覽器，正式共享訂單及管理權限尚待實作。

## 已知問題與接續順序

1. 先切分欄位與分類區塊，再辨識 M／L 標頭並依價格的 X 位置映射到各尺寸。現行原始表格按 Y／X 顯示，跨欄會交錯。加料、說明與廣告區已納入測試，但目前主要靠規則避開。
2. 擴充規格校對與點餐介面。將尺寸選擇、甜度、冰量、加料和價格快照帶入單杯訂單及統計。加入原圖框選對照，對低信心、黏連和缺欄提示人工補值。
3. 驗證實體手機、Safari 及 Firefox。模型首次需從 Paddle 官方資源下載約 21.54 MB，WASM 由網站同源供應。瀏覽器 SDK 目前在主執行緒辨識，慢速裝置的操作流暢度待測。
4. 再規劃團購場次、截止、管理權限與訂單編輯連結。姓名僅用於識別訂單文字。Google Apps Script 應在服務端驗證場次、操作權限、結單及價格快照，並考慮同時送單與重送。
5. 正式發布前，在目標環境驗證外部模型 CORS、快取、處理時間與錯誤回復。在公開頁面只使用需要對外公開的設定。

安裝及本機指令見 [README](README.md)。需保留的技術決策和變更紀錄見 [DECISIONS](DECISIONS.md) 與 [CHANGELOG](CHANGELOG.md)。
