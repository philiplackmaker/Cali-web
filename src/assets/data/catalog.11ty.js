// The shop's products, by variant: the basket reads prices and stock from here, and the
// checkout function (netlify/functions/checkout.mjs) reads it to charge the right price.
import { variantIndex } from '../../scripts/lib/catalog.js';

export const data = {
  permalink: '/assets/data/catalog.json',
  eleventyExcludeFromCollections: true,
};

export function render({ shop }) {
  return JSON.stringify(variantIndex(shop.products));
}
