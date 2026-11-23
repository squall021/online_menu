import { $, esc, uid } from './dom.js';
import { isMenuReady } from './menu.js';

export function setupOrderForm(state, persist, openOrders) {
  const cart = new Map();

  function selectedItems() {
    if (!isMenuReady(state.products)) return [];
    return state.products.filter(product => cart.get(product.id) > 0)
      .map(product => ({ name: product.name, price: product.price, qty: cart.get(product.id) }));
  }

  function total(items) {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }

  function render() {
    const ready = isMenuReady(state.products);
    if (!ready) cart.clear();
    $('#form-title').textContent = state.shop + ' — 點餐';
    $('#shop-items').innerHTML = ready ? state.products.map(product => `<div class="food">
      <div><strong>${esc(product.name)}</strong><p class="muted">${esc(product.category)}</p></div>
      <div class="price">$${product.price}</div>
      <div class="qty"><button data-delta="-1" data-id="${esc(product.id)}">－</button>
        <span>${cart.get(product.id) || 0}</span>
        <button data-delta="1" data-id="${esc(product.id)}">＋</button></div>
      </div>`).join('') : '<p>請在校對菜單頁確認全部商品及價格，才能開始點餐。</p>';
    const items = selectedItems();
    $('#cart').innerHTML = items.map(item => `<p>${esc(item.name)} × ${item.qty} <b>$${item.price * item.qty}</b></p>`)
      .join('') + `<div class="total">合計 NT$ ${total(items)}</div>`;
    $('#submit').disabled = !ready;
  }

  $('#shop-items').onclick = event => {
    const button = event.target.closest('[data-delta]');
    if (!button || !isMenuReady(state.products)) return;
    const id = button.dataset.id;
    cart.set(id, Math.max(0, (cart.get(id) || 0) + Number(button.dataset.delta)));
    render();
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
