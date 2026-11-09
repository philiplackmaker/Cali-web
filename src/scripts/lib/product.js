// Reads the catalogue model from the brief: originals and prints, told apart by tag.

export const isOriginal = (product) => product.tags?.includes('original') ?? false;
export const isPrint = (product) => product.tags?.includes('print') ?? false;
export const isSold = (product) => product.availableForSale === false;
/** Tag a product `price-on-request` in Shopify to hide its price and sell by enquiry. */
export const isPriceOnRequest = (product) => product.tags?.includes('price-on-request') ?? false;

export function editionSize(product) {
  const n = Number(product.editionSize?.value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** "Oil on canvas · 60 × 80 cm · 2026" for originals, "Giclée print · from A4" style for prints. */
export function productSummary(product) {
  if (isOriginal(product)) {
    return [product.medium?.value, product.dimensions?.value, product.year?.value]
      .filter(Boolean)
      .join(' · ');
  }
  const sizes = [
    ...new Set(
      (product.variants?.nodes ?? []).flatMap((v) =>
        v.selectedOptions.filter((o) => o.name === 'Size').map((o) => o.value),
      ),
    ),
  ];
  return [product.medium?.value, sizes.length ? sizes.join(', ') : null]
    .filter(Boolean)
    .join(' · ');
}

/** Badges to show, in order. */
export function productBadges(product) {
  const badges = [];
  if (isSold(product)) badges.push({ kind: 'sold' });
  if (isOriginal(product)) badges.push({ kind: 'original' });
  if (isPrint(product)) {
    badges.push({ kind: 'print' });
    const size = editionSize(product);
    if (size) badges.push({ kind: 'edition', edition: size });
  }
  return badges;
}

/** The variant matching every chosen option ({ Size: "A4", Paper: "Cotton rag" }), if any. */
export function findVariant(variants, choices) {
  return variants.find((v) => v.selectedOptions.every((o) => choices[o.name] === o.value));
}

/**
 * For the variant picker: each option's values, which one is chosen, and whether picking it
 * (keeping the other choices) lands on an available variant.
 */
export function optionStates(product, selected = product.variants.nodes[0]) {
  const variants = product.variants.nodes;
  const choices = Object.fromEntries(selected.selectedOptions.map((o) => [o.name, o.value]));
  return product.options.map((option) => ({
    name: option.name,
    values: option.optionValues.map(({ name }) => ({
      name,
      checked: choices[option.name] === name,
      available: Boolean(
        findVariant(variants, { ...choices, [option.name]: name })?.availableForSale,
      ),
    })),
  }));
}
