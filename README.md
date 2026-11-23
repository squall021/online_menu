# 團購點餐系統（Menu OCR）

使用開源 PaddleOCR 在瀏覽器辨識菜單。發起人逐項校對後可產生本機點餐表單。同事只需填姓名即可選餐。V1 提供菜單 JSON、訂單統計與 CSV 匯出，以瀏覽器 `localStorage` 保存菜單和測試訂單。

手機和電腦可直接開啟 [GitHub Pages 測試網頁](https://squall021.github.io/online_menu/)。測試訂單會存於各自的瀏覽器。

## 本機執行

使用 Vite 7 支援的 Node.js（20.19+ 的 20.x，或 22.12+）。本輪已驗證 Node.js 26.13.0。

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

打開終端顯示的網址，選擇先喝道、50嵐，或上傳 JPG、PNG、WebP，然後按「開始 PaddleOCR 辨識」。第一次辨識時，瀏覽器從 Paddle 官方下載兩個 PP-OCRv5 模型封存檔，合計約 21.54 MB。圖片在瀏覽器內處理。原始結果 JSON 保留文字框、分數與執行環境。

按「重新解析成商品」產生候選。依原圖修正品名、分類及價格，再逐項勾選確認。遇到雙價，將「計價方式」選為「中杯 M／大杯 L」，核對兩個價格後即可讓同事在點餐頁選杯型。同一飲品的 M、L 分別計算數量及金額。待確認價格會留空。測試訂單只會留在建立訂單的瀏覽器。

## 建置與預覽

```powershell
npm.cmd run build

$env:BASE_PATH='/online_menu/'
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

`main` 的程式變更會觸發 GitHub Actions。工作流程依 Pages 設定取得 `/online_menu/` 路徑、用 npm lockfile 安裝依賴，再發布 `dist/`。 [部署工作流程](.github/workflows/pages.yml)

逐項結果見 [OCR 測試報告](docs/OCR_TEST_REPORT.md)。架構、已知限制與後續規劃見 [交接文件](PROJECT_HANDOFF.md)。

- [PaddleOCR 官方瀏覽器 SDK 文件](https://github.com/PaddlePaddle/PaddleOCR/blob/main/paddleocr-js/packages/core/README.md)
