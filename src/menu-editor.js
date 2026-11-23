import { $, download, esc, uid } from './dom.js';
import {
  createProduct, cupPrices, cupSizeLabels, hasValidPrices, isValidProduct, normalizePrice,
  normalizeProduct, setCupPrice,
} from './menu.js';

function priceField(id, label, price, size = '') {
  const inputId = `price-${esc(id)}-${size || 'single'}`;
  return `<div><label for="${inputId}">${label}</label>
    <input id="${inputId}" data-k="${size ? 'cupPrice' : 'price'}" data-size="${size}"
      type="number" inputmode="numeric" min="1" step="1" value="${esc(price)}" placeholder="待確認"></div>`;
}

function renderPricing(product) {
  const id = esc(product.id);
  const sized = product.priceMode === 'sizes';
  const priceEvidence = Array.isArray(product.priceCandidates)
    ? product.priceCandidates.filter(entry => Number.isFinite(entry?.price))
      .map(({ label, price }) => label ? `${label} ${price}` : String(price)).join(' / ')
    : '';
  return `<td class="price-editor">
    <label for="pricing-${id}">計價方式</label>
    <select id="pricing-${id}" data-k="priceMode">
      <option value="single" ${sized ? '' : 'selected'}>單一價格</option>
      <option value="sizes" ${sized ? 'selected' : ''}>中杯 M／大杯 L</option>
    </select>
    <div data-pricing="single" ${sized ? 'hidden' : ''}>${priceField(product.id, '價格', product.price)}</div>
    <div data-pricing="sizes" ${sized ? '' : 'hidden'}>
      ${cupPrices(product).map(({ size, price }) => priceField(product.id, cupSizeLabels[size], price, size)).join('')}
    </div>
    <small class="warn pending-price">${hasValidPrices(product) ? '' : '待確認'}</small>
    ${priceEvidence ? `<small>OCR 價格 ${esc(priceEvidence)}</small>` : ''}
  </td>`;
}

export function setupMenuEditor(state, persist, openForm) {
  const confirmReady = $('#confirm-ready');
  const progress = $('#review-progress');
  const canConfirm = product => !product.reviewed && isValidProduct(product);

  function renderReviewProgress() {
    const confirmed = state.products.filter(product => product.reviewed).length;
    const incomplete = state.products.filter(product => !isValidProduct(product)).length;
    const remaining = incomplete ? `，${incomplete} 筆待補品名或價格` : '';
    const message = `已確認 ${confirmed}／${state.products.length} 筆${remaining}。`;
    if (progress.textContent !== message) progress.textContent = message;
    confirmReady.setAttribute('aria-disabled', String(!state.products.some(canConfirm)));
  }

  function render() {
    $('#nProducts').textContent = state.products.length;
    $('#products').innerHTML = state.products.map(product => `<tr data-id="${esc(product.id)}">
        <td><input data-k="name" value="${esc(product.name)}" aria-label="品名">
          ${product.optionHint ? `<small class="warn">${esc(product.optionHint)}</small>` : ''}</td>
        ${renderPricing(product)}
        <td><input data-k="category" value="${esc(product.category)}" aria-label="分類" style="width:115px"></td>
        <td><label class="inline"><input type="checkbox" data-k="reviewed" ${product.reviewed ? 'checked' : ''}> 已確認</label>
          <small>${esc(product.source || '手動輸入')}</small></td>
        <td><button class="danger" data-delete="${esc(product.id)}">刪除</button></td>
      </tr>`).join('') || '<tr><td colspan="5">目前沒有商品，請先 OCR 辨識或手動新增。</td></tr>';
    renderReviewProgress();
  }

  confirmReady.onclick = () => {
    const ready = state.products.filter(canConfirm);
    if (!ready.length) return;
    for (const product of ready) product.reviewed = true;
    persist();
    render();
  };

  $('#shop').value = state.shop;
  $('#shop').oninput = event => {
    state.shop = event.target.value;
    persist();
  };

  $('#products').oninput = event => {
    const input = event.target;
    const row = input.closest('tr[data-id]');
    const key = input.dataset.k;
    if (!row || !key) return;
    const product = state.products.find(item => item.id === row.dataset.id);
    if (key === 'reviewed') {
      const confirmed = input.checked;
      product.reviewed = confirmed && isValidProduct(product);
      input.checked = product.reviewed;
      if (confirmed && !product.reviewed) {
        alert('請先確認品名，並填寫所選計價方式的所有價格。');
      }
    } else {
      if (key === 'cupPrice') setCupPrice(product, input.dataset.size, normalizePrice(input.value));
      else product[key] = key === 'price' ? normalizePrice(input.value) : input.value;
      if (key === 'priceMode') {
        for (const fields of row.querySelectorAll('[data-pricing]')) {
          fields.hidden = fields.dataset.pricing !== product.priceMode;
        }
      }
      row.querySelector('.pending-price').textContent = hasValidPrices(product) ? '' : '待確認';
      product.reviewed = false;
      row.querySelector('[data-k="reviewed"]').checked = false;
    }
    persist();
    renderReviewProgress();
  };
  $('#products').onclick = event => {
    const button = event.target.closest('[data-delete]');
    if (!button) return;
    state.products = state.products.filter(product => product.id !== button.dataset.delete);
    persist();
    render();
  };
  $('#add').onclick = () => {
    state.products.push(createProduct({ source: '手動新增' }));
    persist();
    render();
  };
  $('#export').onclick = () => download('menu.json', JSON.stringify({
    shop: state.shop, products: state.products,
  }, null, 2), 'application/json');
  $('#import-trigger').onclick = () => $('#import').click();
  $('#import').onchange = async event => {
    const [file] = event.target.files;
    event.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.products)) throw new Error('缺少 products 陣列');
      state.products = data.products.filter(product => typeof product?.name === 'string')
        .map(product => normalizeProduct({ ...product, id: uid() }));
      state.shop = String(data.shop || '未命名店家');
      $('#shop').value = state.shop;
      persist();
      render();
    } catch (error) {
      alert('匯入失敗：' + error.message);
    }
  };
  $('#publish').onclick = () => {
    if (!state.products.length) return alert('請先新增商品。');
    const invalid = state.products.filter(product => !isValidProduct(product)).length;
    if (invalid) return alert(`有 ${invalid} 筆品名或價格待確認。`);
    const unreviewed = state.products.filter(product => !product.reviewed).length;
    if (unreviewed) return alert(`請先確認全部商品。尚有 ${unreviewed} 筆未確認。`);
    openForm();
  };

  return render;
}
