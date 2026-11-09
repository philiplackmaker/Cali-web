// The docs' example products, for the basket on /design-system/ pages (data-commerce="mock").
import { variantIndex } from '../../scripts/lib/catalog.js';

export const data = {
  permalink: '/assets/data/mock-catalog.json',
  eleventyExcludeFromCollections: true,
};

export function render({ mock }) {
  return JSON.stringify(variantIndex(mock.products));
}
