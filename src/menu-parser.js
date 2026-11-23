import { createProduct } from './menu.js';

const amount = '[1-9][0-9]{1,2}';
const labeledPrices = new RegExp(`^(?:\\(M\\)|M)\\s*(${amount})\\s*(?:\\(L\\)|L)\\s*(${amount})$`, 'i');
const numericPrices = new RegExp(`^(${amount})(?:\\s+(${amount}))?$`);
const inlinePrice = new RegExp(`^(.+?)\\s+[.$]?\\s*(${amount}(?:\\s+${amount})?)$`);
const excluded = /^(?:找好茶|找奶茶|找拿鐵|找新鮮|找新鲜|季節限定|加料|冰量|甜度|正常|少冰|微冰|去冰|熱飲|溫熱飲|無糖|全糖|半糖|少糖|微糖|微微糖|\(|備註)/;
const stripMarker = text => text.replace(/^[\s★☆*＊✱]+/u, '').trim();
const sameRow = (a, b) => Math.abs(a.cy - b.cy) <= Math.min(8, Math.min(a.h, b.h) * 0.45);
const byPosition = (a, b) => a.cy - b.cy || a.x - b.x;

function readPrices(text) {
  const explicit = text.match(labeledPrices);
  if (explicit) return [
    { label: 'M', price: Number(explicit[1]) }, { label: 'L', price: Number(explicit[2]) },
  ];
  const numeric = text.match(numericPrices);
  return numeric ? numeric.slice(1).filter(Boolean).map(value => ({ price: Number(value) })) : [];
}

function productName(text) {
  const name = stripMarker(text);
  const comparable = name.normalize('NFKC');
  const han = comparable.match(/\p{Script=Han}/gu) ?? [];
  return han.length >= 2 && comparable.length <= 40 && !excluded.test(comparable) ? name : null;
}

function candidate(name, rows, prices) {
  const confidence = Math.min(...rows.map(row => row.score));
  const pending = prices.length !== 1 || !Number.isFinite(confidence) || confidence < 0.8;
  let optionHint = '';
  if (prices.length > 1) optionHint = '偵測到多個價格，請確認尺寸後分列，或為此列指定單一尺寸與價格。';
  else if (!prices.length) optionHint = '價格字元相連或無法讀取，請依原圖填寫。';
  else if (pending) optionHint = '品名或價格的 OCR 信心偏低，請依原圖填寫價格。';

  return createProduct({
    name,
    price: pending ? null : prices[0].price,
    source: 'PaddleOCR 候選',
    confidence: Number.isFinite(confidence) ? confidence : null,
    optionHint,
    priceCandidates: prices,
    ocrItemIndexes: rows.map(row => row.index),
    optionGroups: prices.length > 1 && prices.every(price => price.label)
      ? [{ type: 'size', label: '尺寸', options: prices.map(price => ({ ...price })) }]
      : [],
  });
}

export function parseProducts(lines) {
  const rows = lines.filter(line => line.score >= 0.3 || !Number.isFinite(line.score));
  const boxes = rows.map(row => {
    const normalized = row.text.normalize('NFKC').trim();
    const prices = readPrices(normalized);
    return { row, prices, normalized };
  }).filter(box => box.prices.length || /^\d{4}$/.test(box.normalized));
  const priceRows = new Set(boxes.map(box => box.row));
  const used = new Set();
  const candidates = [];

  for (const row of rows) {
    if (priceRows.has(row)) continue;
    // NFKC joins full-width price punctuation without modifying the original OCR export.
    const normalized = row.text.normalize('NFKC');
    const sizeAt = normalized.search(/\(M\)/i);
    const match = sizeAt < 0 ? normalized.match(inlinePrice)
      : [normalized, normalized.slice(0, sizeAt), normalized.slice(sizeAt)];
    if (!match) continue;
    const name = productName(match[1]);
    const prices = readPrices(match[2].trim());
    if (!name || !prices.length) continue;
    candidates.push({ row, product: candidate(name, [row], prices) });
    used.add(row);
  }

  for (const box of boxes.sort((a, b) => a.row.x - b.row.x)) {
    if (used.has(box.row)) continue;
    const group = [box];
    for (const next of boxes) {
      const previous = group.at(-1).row;
      if (next.row.x > previous.x && !used.has(next.row) && sameRow(next.row, box.row) &&
          next.row.x - previous.right <= Math.max(12, previous.h)) group.push(next);
    }
    const leftBoundary = boxes.reduce((edge, previous) =>
      previous.row.right < box.row.x && sameRow(previous.row, box.row)
        ? Math.max(edge, previous.row.right) : edge, box.row.x - 290);
    const names = rows.filter(row => !used.has(row) && !priceRows.has(row) && sameRow(row, box.row) &&
      row.x >= leftBoundary && row.right <= box.row.x + 4 && productName(row.text));
    const name = names.sort((a, b) => b.right - a.right)[0];
    if (!name) continue;

    const evidence = [name, ...group.map(item => item.row)];
    const prices = group.every(item => item.prices.length)
      ? group.flatMap(item => item.prices) : [];
    candidates.push({ row: name, product: candidate(productName(name.text), evidence, prices) });
    for (const row of evidence) used.add(row);
  }

  // A tall malformed price block can cover multiple printed rows. Preserve those names for review.
  for (const merged of rows) {
    if (!/^\p{Script=Han}{1,3}\d{1,2}$/u.test(merged.text.normalize('NFKC')) ||
        !boxes.some(({ row, prices }) => prices.length && Math.abs(row.x - merged.x) <= 12 &&
          Math.abs(row.cy - merged.cy) <= 85 && merged.h >= row.h * 1.6)) continue;
    for (const row of rows) {
      if (used.has(row) || row.cy < merged.y || row.cy > merged.bottom ||
          row.right > merged.x || merged.x - row.x > 290) continue;
      const name = productName(row.text);
      if (!name) continue;
      candidates.push({ row, product: candidate(name, [row, merged], []) });
      used.add(row);
    }
  }

  return candidates.sort((a, b) => byPosition(a.row, b.row)).map(({ product }) => product);
}
