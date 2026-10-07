import { ITEMS } from '../../gameplay/items.js';
export const PRODUCT_IDS = ['milk', 'riceball', 'tea', 'coffee'];
export const product = (id) => (PRODUCT_IDS.includes(id) ? ITEMS[id] : null);
export { PACKAGING } from '../../gameplay/grocery-labels.js';
