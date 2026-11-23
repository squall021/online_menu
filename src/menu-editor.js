import { $, download, esc, uid } from './dom.js';
import { createProduct, isValidProduct, normalizePrice, normalizeProduct } from './menu.js';

export function setupMenuEditor(state, persist, openForm) {
  function render() {
    $('#nProducts').textContent = state.products.length;
    $('#products').innerHTML = state.products.map(product => {
      const priceEvidence = Array.isArray(product.priceCandidates)
        ? product.priceCandidates.filter(entry => Number.isFinite(entry?.price))
          .map(({ label, price }) => label ? `${label} ${price}` : String(price)).join(' / ')
        : '';
      return `<tr data-id="${esc(product.id)}">
        <td><input data-k="name" value="${esc(product.name)}" aria-label="品名">
          ${product.optionHint ? `<small class="warn">${esc(product.optionHint)}</small>` : ''}</td>
        <td><input data-k="price" type="number" min="1" step="1" value="${esc(product.price)}" placeholder="待確認" aria-label="價格" style="width:94px">
          <small class="warn pending-price">${product.price == null ? '待確認' : ''}</small>
          ${priceEvidence ? `<small>OCR 價格 ${esc(priceEvidence)}</small>` : ''}</td>
        <td><input data-k="category" value="${esc(product.category)}" aria-label="分類" style="width:115px"></td>
        <td><label class="inline"><input type="checkbox" data-k="reviewed" ${product.reviewed ? 'checked' : ''}> 已確認</label>
          <small>${esc(product.source || '手動輸入')}</small></td>
        <td><button class="danger" data-delete="${esc(product.id)}">刪除</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">目前沒有商品，請先 OCR 辨識或手動新增。</td></tr>';
  }

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
      product.reviewed = input.checked && isValidProduct(product);
      input.checked = product.reviewed;
      if (!product.reviewed && !isValidProduct(product)) alert('請先確認品名並填寫有效的單一價格。');
    } else {
      product[key] = key === 'price' ? normalizePrice(input.value) : input.value;
      if (key === 'price') row.querySelector('.pending-price').textContent = product.price == null ? '待確認' : '';
      product.reviewed = false;
      row.querySelector('[data-k="reviewed"]').checked = false;
    }
    persist();
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
