// Formats Storefront API MoneyV2 values ({ amount: "450.0", currencyCode: "GBP" }).
// Shared by Eleventy (build-time) and the browser (variant switching, cart).

const formatters = new Map();

function formatter(locale, currency, fractionDigits) {
  const key = `${locale}|${currency}|${fractionDigits}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
    );
  }
  return formatters.get(key);
}

/** "£450" for whole amounts, "£45.50" otherwise. */
export function formatMoney(money, locale = 'en-GB') {
  if (!money) return '';
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) throw new TypeError(`Not a money amount: ${money.amount}`);
  return formatter(locale, money.currencyCode, Number.isInteger(amount) ? 0 : 2).format(amount);
}

const isMore = (a, b) => Boolean(a && b) && Number(a.amount) > Number(b.amount);

/**
 * Works out what a price should say.
 * Pass either a variant ({ price, compareAtPrice }) or a product
 * ({ priceRange: { minVariantPrice, maxVariantPrice }, compareAtPriceRange }).
 */
export function describePrice(input, locale = 'en-GB') {
  const price = input.price ?? input.priceRange?.minVariantPrice;
  const max = input.priceRange?.maxVariantPrice;
  const compareAt = input.compareAtPrice ?? input.compareAtPriceRange?.minVariantPrice;
  const from = Boolean(max) && Number(max.amount) > Number(price.amount);
  const onSale = isMore(compareAt, price);
  return {
    from,
    onSale,
    current: formatMoney(price, locale),
    compareAt: onSale ? formatMoney(compareAt, locale) : null,
  };
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Same markup as components/price/price.njk, for updating prices in the browser. */
export function priceInnerHtml(view) {
  const from = view.from ? '<span class="ds-price__from">From</span> ' : '';
  const current = `<span class="ds-price__current">${escapeHtml(view.current)}</span>`;
  const compare = view.compareAt
    ? ` <s class="ds-price__compare"><span class="ds-visually-hidden">Was </span>${escapeHtml(view.compareAt)}</s>`
    : '';
  const sale = view.onSale ? '<span class="ds-visually-hidden">, on sale</span>' : '';
  return `${from}${current}${sale}${compare}`;
}
