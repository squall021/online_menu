import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseProducts } from '../src/menu-parser.js';

const line = (index, text, x, right, cy = 100) => ({
  index, text, x, right, cy, y: cy - 10, bottom: cy + 10, h: 20, score: 0.99,
});

test('pairs separate currency-marked prices with the correct menu column', () => {
  const products = parseProducts([
    line(0, '雞排', 10, 62),
    line(1, '＄ 80', 100, 140),
    line(2, '雞翅', 170, 216),
    line(3, '$35□', 245, 290),
  ]);
  assert.deepEqual(products.map(({ name, price }) => [name, price]), [
    ['雞排', 80], ['雞翅', 35],
  ]);
  assert.ok(products.every(product => !product.reviewed));
});

test('reads an inline price without a space and removes menu checkbox marks', () => {
  const products = parseProducts([
    line(0, '玉米筍$40□', 10, 165),
    line(1, '炸豆腐□', 10, 104, 150),
    line(2, '$30□ 蒜蓉', 120, 219, 150),
  ]);
  assert.deepEqual(products.map(({ name, price }) => [name, price]), [
    ['玉米筍', 40], ['炸豆腐', 30],
  ]);
});

test('uses the base price when a checkbox separates an optional surcharge', () => {
  const products = parseProducts([
    line(0, '雞肉串', 10, 88),
    line(1, '起司+$10□$45', 115, 260),
    line(2, '辣粉+$10', 10, 125, 150),
    line(3, '套餐$30□$40', 10, 155, 190),
  ]);
  assert.deepEqual(products.map(({ name, price }) => [name, price]), [['雞肉串', 45]]);
});

test('preserves parsing of the two drink menus and their M/L pricing', () => {
  const parseSample = name => {
    const file = new URL(`../docs/ocr-evidence/${name}-raw.json`, import.meta.url);
    return parseProducts(JSON.parse(readFileSync(file, 'utf8')).lines);
  };
  const taotao = parseSample('taotao');
  const lan = parseSample('50lan');
  assert.equal(taotao.length, 49);
  assert.equal(lan.length, 54);
  assert.equal(taotao.filter(product => product.priceMode === 'sizes').length, 2);
  assert.equal(lan.filter(product => product.priceMode === 'sizes').length, 53);
});
