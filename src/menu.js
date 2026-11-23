import { uid } from './dom.js';

export const cupSizeLabels = { M: '中杯 M', L: '大杯 L' };
const cupSizes = Object.keys(cupSizeLabels);

const sizeGroup = groups => groups.find(group => group?.type === 'size');
const sizeOptions = group => Array.isArray(group?.options) ? group.options : [];

export function normalizePrice(value) {
  const price = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isSafeInteger(price) && price > 0 ? price : null;
}

export function normalizeProduct(product) {
  const price = normalizePrice(product.price);
  const optionGroups = Array.isArray(product.optionGroups) ? product.optionGroups : [];
  const options = sizeOptions(sizeGroup(optionGroups));
  const hasCupPair = cupSizes.every(size => options.some(option => option?.label === size));
  const hasTwoCandidates = Array.isArray(product.priceCandidates) && product.priceCandidates.length === 2;
  const legacySizes = price === null && (hasCupPair || hasTwoCandidates);
  const priceMode = product.priceMode === 'sizes' || (product.priceMode !== 'single' && legacySizes)
    ? 'sizes' : 'single';
  const normalized = {
    ...product,
    price,
    priceMode,
    optionGroups,
  };
  normalized.reviewed = product.reviewed === true && (product.priceMode === 'sizes' || price !== null)
    && isValidProduct(normalized);
  return normalized;
}

export function createProduct(fields = {}) {
  return normalizeProduct({
    id: uid(), name: '', price: null, category: '未分類', reviewed: false, ...fields,
  });
}

export function cupPrices(product) {
  const options = sizeOptions(sizeGroup(product.optionGroups));
  return cupSizes.map(size => ({
    size, price: normalizePrice(options.find(option => option?.label === size)?.price),
  }));
}

export function setCupPrice(product, size, price) {
  const group = sizeGroup(product.optionGroups);
  const options = sizeOptions(group);
  const index = options.findIndex(option => option?.label === size);
  const updated = [...options];
  if (index === -1) updated.push({ label: size, price });
  else updated[index] = { ...options[index], price };
  const updatedGroup = group ? { ...group, options: updated } : { type: 'size', label: '杯型', options: updated };
  product.optionGroups = group
    ? product.optionGroups.map(optionGroup => optionGroup === group ? updatedGroup : optionGroup)
    : [...product.optionGroups, updatedGroup];
}

export const productVariants = product => product.priceMode === 'sizes'
  ? cupPrices(product) : [{ size: '', price: product.price }];

export const hasValidPrices = product =>
  productVariants(product).every(({ price }) => Number.isSafeInteger(price) && price > 0);

export const isValidProduct = product =>
  typeof product.name === 'string' && Boolean(product.name.trim()) && hasValidPrices(product);

export const orderItemName = item =>
  item.size && Object.hasOwn(cupSizeLabels, item.size) ? `${item.name}（${cupSizeLabels[item.size]}）` : item.name;

export const isMenuReady = products =>
  products.length > 0 && products.every(product => isValidProduct(product) && product.reviewed);
