import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';

const model = { lang: 'ch', ocrVersion: 'PP-OCRv5' };
const settings = { textDetLimitSideLen: 1600, textDetLimitType: 'max' };
let ocr;

function normalizeLines(items) {
  return items.flatMap(({ poly, text, score }, index) => {
    const value = text?.trim();
    if (!value || !Array.isArray(poly) || !poly.length ||
        !poly.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return [];

    const xs = poly.map(point => point[0]);
    const ys = poly.map(point => point[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    return [{ index, text: value, score, poly, x, y, right, bottom,
      cx: (x + right) / 2, cy: (y + bottom) / 2, h: bottom - y }];
  });
}

export async function recognizeMenu(file, onPhase) {
  if (!ocr) {
    onPhase('載入 PaddleOCR PP-OCRv5 模型，首次需下載資源…');
    try {
      const { PaddleOCR } = await import('@paddleocr/paddleocr-js');
      ocr = await PaddleOCR.create({ ...model, ortOptions: {
        backend: 'wasm', numThreads: 1,
        // Resolve the matching ORT binary through Vite in dev and under the production base path.
        wasmPaths: { wasm: wasmUrl }
      } });
    } catch (error) {
      throw new Error(`模型或執行環境載入失敗：${error.message}`, { cause: error });
    }
  }

  onPhase('辨識中，較大的菜單圖片可能需要較長時間…');
  const [result] = await ocr.predict(file, settings);
  if (!Array.isArray(result?.items)) throw new Error('SDK 回傳格式缺少 items 陣列。');

  return {
    source: 'paddleocr-browser',
    image: file.name,
    dimensions: result.image,
    model,
    settings,
    runtime: result.runtime,
    initialization: ocr.getInitializationSummary(),
    metrics: result.metrics,
    items: result.items,
    lines: normalizeLines(result.items),
  };
}
