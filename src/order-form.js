import { $, esc, uid } from './dom.js';
import { cupSizeLabels, isMenuReady, orderItemName, productVariants } from './menu.js';

const cartKey = (product, variant) => JSON.stringify([product.id, variant.size, variant.price]);

export function setupOrderForm(state, persist, openOrders) {
  const cart = new Map();
  const shopItems = $('#shop-items');

  function selectedItems() {
    if (!isMenuReady(state.products)) return [];
    return state.products.flatMap(product => productVariants(product).flatMap(variant => {
      const qty = cart.get(cartKey(product, variant));
      if (!qty) return [];
      const item = { name: product.name, price: variant.price, qty };
      if (variant.size) item.size = variant.size;
      return [item];
    }));
  }

  function total(items) {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function renderCart() {
    const items = selectedItems();
    $('#cart').innerHTML = items.map(item => `<p>${esc(orderItemName(item))} × ${item.qty} <b>$${item.price * item.qty}</b></p>`)
      .join('') + `<div class="total">合計 NT$ ${total(items)}</div>`;
  }

  function renderProduct(product, selectedSize) {
    const id = esc(product.id);
    const variants = productVariants(product);
    const selected = variants.find(variant => variant.size === selectedSize) ?? variants[0];
    const sizeChoices = selected.size ? `<fieldset class="cup-selector">
      <legend>杯型</legend>
      <div class="cup-choices">${variants.map(({ size, price }) => `<div class="cup-choice">
        <input type="radio" id="cup-${id}-${size}" name="cup-${id}" data-cup-size value="${size}"
          ${size === selected.size ? 'checked' : ''}>
        <label for="cup-${id}-${size}">${cupSizeLabels[size]} <b>$${price}</b></label>
      </div>`).join('')}</div>
    </fieldset>` : '';
    const label = esc(orderItemName({ name: product.name, size: selected.size }));
    return `<div class="food" data-product-id="${id}">
      <div><strong>${esc(product.name)}</strong><p class="muted">${esc(product.category)}</p>${sizeChoices}</div>
      ${sizeChoices ? '' : `<div class="price">$${selected.price}</div>`}
      <div class="qty" role="group" aria-label="${label}數量">
        <button type="button" data-delta="-1" aria-label="減少數量">－</button>
        <span data-quantity aria-live="polite">${cart.get(cartKey(product, selected)) || 0}</span>
        <button type="button" data-delta="1" aria-label="增加數量">＋</button>
      </div>
    </div>`;
  }

  function render() {
    const ready = isMenuReady(state.products);
    if (!ready) cart.clear();
    const selectedSizes = new Map([...shopItems.querySelectorAll('[data-cup-size]:checked')].map(input =>
      [input.closest('[data-product-id]').dataset.productId, input.value]));
    $('#form-title').textContent = state.shop + ' — 點餐';
    shopItems.innerHTML = ready
      ? state.products.map(product => renderProduct(product, selectedSizes.get(product.id))).join('')
      : '<p>請在校對菜單頁確認全部商品及價格，才能開始點餐。</p>';
    renderCart();
    $('#submit').disabled = !ready;
  }

  function updateQuantity(target, delta) {
    const row = target.closest('[data-product-id]');
    const product = state.products.find(item => item.id === row.dataset.productId);
    if (!product) return;
    const size = row.querySelector('[data-cup-size]:checked')?.value ?? '';
    const variant = productVariants(product).find(item => item.size === size);
    if (!variant) return;
    const key = cartKey(product, variant);
    const qty = Math.max(0, (cart.get(key) || 0) + delta);
    if (qty) cart.set(key, qty);
    else cart.delete(key);
    row.querySelector('[data-quantity]').textContent = qty;
    const label = orderItemName({ name: product.name, size });
    row.querySelector('.qty').setAttribute('aria-label', `${label}數量`);
  }

  shopItems.onchange = event => {
    if (event.target.matches('[data-cup-size]')) updateQuantity(event.target, 0);
  };
  shopItems.onclick = event => {
    const button = event.target.closest('[data-delta]');
    if (!button || !isMenuReady(state.products)) return;
    updateQuantity(button, Number(button.dataset.delta));
    renderCart();
  };
  $('#submit').onclick = () => {
    if (!isMenuReady(state.products)) return;
    const name = $('#customer').value.trim();
    const items = selectedItems();
    if (!name) return alert('請輸入姓名');
    if (!items.length) return alert('請至少選擇一項餐點');
    state.orders.push({
      id: uid(), createdAt: new Date().toISOString(), shop: state.shop, name, items,
      note: $('#remark').value.trim(), total: total(items),
    });
    persist();
    cart.clear();
    $('#remark').value = '';
    alert('測試訂單已儲存在這台裝置。');
    openOrders();
  };

  return render;
}
