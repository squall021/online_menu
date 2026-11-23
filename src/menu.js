import { uid } from './dom.js';

export function normalizePrice(value) {
  const price = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export function normalizeProduct(product) {
  return {
    ...product,
    price: normalizePrice(product.price),
    reviewed: product.reviewed === true,
    optionGroups: Array.isArray(product.optionGroups) ? product.optionGroups : [],
  };
}

export function createProduct(fields = {}) {
  return normalizeProduct({
    id: uid(), name: '', price: null, category: '未分類', reviewed: false, ...fields,
  });
}

export const isValidProduct = product =>
  typeof product.name === 'string' && Boolean(product.name.trim()) &&
  Number.isSafeInteger(product.price) && product.price > 0;

export const isMenuReady = products =>
  products.length > 0 && products.every(product => isValidProduct(product) && product.reviewed);
