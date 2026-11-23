import './style.css';
import { recognizeMenu } from './ocr.js';
import { parseProducts } from './menu-parser.js';
import { normalizeProduct } from './menu.js';
import { setupMenuEditor } from './menu-editor.js';
import { setupOrderForm } from './order-form.js';
import { setupOrderStats } from './order-stats.js';
import { $, download, esc } from './dom.js';

const state={recognition:null,products:[],orders:[],shop:'未命名店家'};
const persist=()=>{localStorage.setItem('menu-ocr-v1-products',JSON.stringify(state.products));localStorage.setItem('menu-ocr-v1-orders',JSON.stringify(state.orders));localStorage.setItem('menu-ocr-v1-shop',state.shop)};
try{state.products=JSON.parse(localStorage.getItem('menu-ocr-v1-products')||'[]').map(normalizeProduct);state.orders=JSON.parse(localStorage.getItem('menu-ocr-v1-orders')||'[]');state.shop=localStorage.getItem('menu-ocr-v1-shop')||state.shop}catch{}
$('#app').innerHTML=`<header><div class="brand">餐點接龍 → 線上點餐 <span>OCR V1</span></div><div class="sub">PaddleOCR 瀏覽器版 · 無登入 · 本機測試原型</div></header><main>
<section class="intro"><h1>從菜單圖片到點餐表單</h1><p>先辨識，再人工校對，最後生成點餐頁。圖片只在瀏覽器內處理；此測試版訂單只儲存在目前瀏覽器。</p></section>
<nav><button data-tab="ocr" class="active">① 上傳辨識</button><button data-tab="edit">② 校對菜單 <b id="nProducts">0</b></button><button data-tab="form">③ 點餐預覽</button><button data-tab="orders">④ 訂單統計</button></nav>
<section id="ocr" class="panel active"><div class="columns"><div><h2>上傳圖片</h2><label class="upload">選擇圖片<input id="file" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><p class="muted">或直接載入測試菜單：</p><div class="actions"><button class="secondary" id="sample1">先喝道</button><button class="secondary" id="sample2">50嵐</button></div><div id="preview" class="preview">尚未選擇圖片</div><button id="recognize" class="primary" disabled>開始 PaddleOCR 辨識</button><p id="status" class="status" role="status">首次使用需下載辨識模型，請保持網路連線。</p></div><div><h2>OCR 辨識結果</h2><p class="muted">辨識出的每段文字都會保留供核對。自動配對只是候選結果，請確認後才使用。</p><div class="actions"><button class="secondary" id="parse" disabled>重新解析成商品</button><button class="secondary" id="export-ocr" disabled>下載原始辨識 JSON</button></div><div class="scroll"><table><thead><tr><th>文字</th><th>信心</th><th>座標 (X,Y)</th></tr></thead><tbody id="raw"><tr><td colspan="3">尚無辨識結果</td></tr></tbody></table></div></div></div></section>
<section id="edit" class="panel">
  <div class="top"><div><h2>編輯菜單</h2><p class="muted">核對品名和價格後，可一次確認已填妥的商品。</p></div><button id="add" class="primary">＋ 新增商品</button></div>
  <label>店家名稱 <input id="shop" placeholder="例如：先喝道 北區門市"/></label>
  <div class="actions">
    <button id="confirm-ready" type="button" class="secondary" aria-disabled="true">批次確認已填妥商品</button>
    <button id="publish" class="primary">前往點餐預覽 →</button>
  </div>
  <p id="review-progress" class="muted" role="status"></p>
  <div class="scroll"><table><thead><tr><th>餐點名稱</th><th>價格（元）</th><th>分類</th><th>審核</th><th></th></tr></thead><tbody id="products"></tbody></table></div>
  <div class="actions"><button class="secondary" id="export">匯出菜單 JSON</button><button class="secondary" id="import-trigger">匯入菜單 JSON</button><input id="import" type="file" accept="application/json,.json" hidden/></div>
</section>
<section id="form" class="panel"><div class="columns narrow"><div><h2 id="form-title">點餐表單</h2><label>訂購人姓名（必填）<input id="customer" placeholder="請輸入姓名" maxlength="40"></label><p class="muted">本機點餐測試</p><div id="shop-items"></div><label>備註<textarea id="remark" placeholder="例如：去冰、半糖、不要辣（依店家實際提供的規格）"></textarea></label></div><div><aside><h2>我的餐點</h2><div id="cart"></div><button class="primary" id="submit">送出測試訂單</button><p class="muted">正式版需串接 Google Apps Script 與 Google Sheets。</p></aside></div></div></section>
<section id="orders" class="panel"><div class="top"><div><h2>測試訂單統計</h2><p class="muted">僅供目前瀏覽器驗證統計邏輯。</p></div><button class="secondary" id="clear-orders">清除測試訂單</button></div><div id="stats"></div><h3>依品項統計</h3><div id="summary"></div><h3>依姓名統計</h3><div id="order-list"></div><button class="secondary" id="orders-csv">下載訂單 CSV</button></section>
</main><footer>Prototype V1 · PaddleOCR.js + Vite · 發布前請先核對餐點與價格</footer>`;
let currentFile = null;
const renderProducts = setupMenuEditor(state, persist, () => tab('form'));
const renderForm = setupOrderForm(state, persist, () => tab('orders'));
const renderOrders = setupOrderStats(state, persist);

function tab(id){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));document.querySelectorAll('main .panel').forEach(p=>p.classList.toggle('active',p.id===id));if(id==='edit')renderProducts();if(id==='form')renderForm();if(id==='orders')renderOrders()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
function status(message,problem=false){$('#status').textContent=message;$('#status').className='status '+(problem?'error':'')}
function resetRecognition(message) {
  state.recognition = null;
  $('#raw').innerHTML = `<tr><td colspan="3">${esc(message)}</td></tr>`;
  $('#parse').disabled = true;
  $('#export-ocr').disabled = true;
}

function lockImageControls(busy) {
  for (const selector of ['#file', '#sample1', '#sample2']) $(selector).disabled = busy;
  $('#recognize').disabled = busy || !currentFile;
}

function showFile(file) {
  const img = document.createElement('img');
  img.alt = '上傳的菜單';
  img.src = URL.createObjectURL(file);
  img.onload = img.onerror = () => URL.revokeObjectURL(img.src);
  currentFile = file;
  $('#preview').replaceChildren(img);
  resetRecognition('按「開始 PaddleOCR 辨識」');
  status(`已載入：${file.name}，請開始辨識。`);
}

$('#file').onchange = event => {
  const [file] = event.target.files;
  event.target.value = '';
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    status('請選擇 JPG、PNG 或 WebP 圖片。', true);
    return;
  }
  showFile(file);
  lockImageControls(false);
};

async function sample(path, name) {
  lockImageControls(true);
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showFile(new File([await response.blob()], name, { type: 'image/jpeg' }));
  } catch (error) {
    status(`載入範例失敗：${error.message}`, true);
  } finally {
    lockImageControls(false);
  }
}
$('#sample1').onclick=()=>sample(`${import.meta.env.BASE_URL}samples/taotao.jpg`,'先喝道.jpg');
$('#sample2').onclick=()=>sample(`${import.meta.env.BASE_URL}samples/50lan.jpg`,'50嵐.jpg');
function renderRaw(lines) {
  const sorted = [...lines].sort((a, b) => a.cy - b.cy || a.x - b.x);
  $('#raw').innerHTML = sorted.length ? sorted.map(line => `<tr><td>${esc(line.text)}</td><td>${Number.isFinite(line.score) ? `${(line.score * 100).toFixed(1)}%` : '—'}</td><td>${Math.round(line.x)}, ${Math.round(line.y)}</td></tr>`).join('') : '<tr><td colspan="3">未辨識到文字</td></tr>';
}

$('#recognize').onclick = async () => {
  if (!currentFile) return;
  lockImageControls(true);
  resetRecognition('等待辨識結果');
  try {
    const result = await recognizeMenu(currentFile, status);
    state.recognition = result;
    renderRaw(result.lines);
    $('#parse').disabled = !result.lines.length;
    $('#export-ocr').disabled = false;
    const time = result.metrics?.totalMs;
    const duration = Number.isFinite(time) ? `；推論約 ${(time / 1000).toFixed(1)} 秒` : '';
    status(`完成，辨識 ${result.lines.length} 段文字${duration}。請檢查原始辨識結果。`);
  } catch (error) {
    console.error(error);
    resetRecognition('沒有可用的辨識結果');
    status(`OCR 執行失敗：${error.message}。請確認網路、模型資源與瀏覽器開發者主控台。`, true);
  } finally {
    lockImageControls(false);
  }
};
$('#parse').onclick=()=>{const candidates=parseProducts(state.recognition?.lines ?? []);if(!candidates.length){status('沒有找到可靠的「品名＋價格」配對，請到校對頁手動新增，或改善圖片清晰度。',true);tab('edit');return}if(state.products.length&&!confirm(`將以 ${candidates.length} 筆 OCR 候選商品取代目前 ${state.products.length} 筆商品。確定嗎？`))return;state.products=candidates;persist();tab('edit')};
$('#export-ocr').onclick=()=>{if(state.recognition)download('ocr-raw.json',JSON.stringify(state.recognition,null,2),'application/json')};
renderProducts();
renderOrders();
