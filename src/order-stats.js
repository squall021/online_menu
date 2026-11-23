import { $, download, esc } from './dom.js';
import { cupSizeLabels, orderItemName } from './menu.js';

const csvCell = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';

export function setupOrderStats(state, persist) {
  function render() {
    const total = state.orders.reduce((sum, order) => sum + order.total, 0);
    const customerCount = new Set(state.orders.map(order => order.name)).size;
    $('#stats').innerHTML = `<div class="metrics"><div><small>測試訂單</small><strong>${state.orders.length}</strong></div>
      <div><small>訂購人數（不同姓名）</small><strong>${customerCount}</strong></div>
      <div><small>訂單總額</small><strong>NT$ ${total}</strong></div></div>`;
    const grouped = new Map();
    for (const order of state.orders) {
      for (const item of order.items) {
        const key = JSON.stringify([item.name, item.size ?? '', item.price]);
        const group = grouped.get(key) || { ...item, qty: 0 };
        group.qty += item.qty;
        grouped.set(key, group);
      }
    }
    $('#summary').innerHTML = [...grouped.values()].map(item => `<div class="line">
      ${esc(orderItemName(item))} × ${item.qty}<strong>$${item.price * item.qty}</strong></div>`).join('') || '<p>尚無訂單</p>';
    $('#order-list').innerHTML = state.orders.map(order => `<div class="order">
      <strong>${esc(order.name)} <span>$${order.total}</span></strong>
      <p>${order.items.map(item => esc(orderItemName(item)) + ' × ' + item.qty).join('、')}</p>
      ${order.note ? `<small>備註：${esc(order.note)}</small>` : ''}</div>`).join('') || '<p>尚無訂單</p>';
  }

  $('#clear-orders').onclick = () => {
    if (!confirm('確定清除目前瀏覽器所有測試訂單？')) return;
    state.orders = [];
    persist();
    render();
  };
  $('#orders-csv').onclick = () => {
    const rows = [['時間', '店家', '姓名', '餐點', '單價', '數量', '小計', '備註', '杯型']];
    for (const order of state.orders) {
      for (const item of order.items) {
        rows.push([order.createdAt, order.shop, order.name, item.name, item.price,
          item.qty, item.price * item.qty, order.note, Object.hasOwn(cupSizeLabels, item.size) ? item.size : '']);
      }
    }
    download('orders.csv', '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'),
      'text/csv;charset=utf-8');
  };

  return render;
}
