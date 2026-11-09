// The Storefront API, from the browser and from the build.
// - storefrontRequest: one GraphQL call, with clear errors
// - createStorefrontClient: the cart methods cart.js expects, plus live product availability
// - Queries and normalisers are exported so the build (src/_data/shop.js) shares them.
// The Storefront access token is a *public* token, made to be shipped to browsers.

export const API_VERSION = '2026-07';

export async function storefrontRequest(
  { domain, token, version = API_VERSION, fetch = globalThis.fetch },
  query,
  variables = {},
) {
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Storefront API ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`Storefront API: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return body.data;
}

// ---- Fragments -------------------------------------------------------------------------

const MONEY = 'amount currencyCode';
const IMAGE = 'id url width height altText';

export const VARIANT_FIELDS = `
  id title availableForSale quantityAvailable
  price { ${MONEY} } compareAtPrice { ${MONEY} }
  selectedOptions { name value }
  image { ${IMAGE} }
`;

export const PRODUCT_FIELDS = `
  id handle title tags availableForSale createdAt updatedAt
  description descriptionHtml
  featuredImage { ${IMAGE} }
  images(first: 20) { nodes { ${IMAGE} } }
  priceRange { minVariantPrice { ${MONEY} } maxVariantPrice { ${MONEY} } }
  compareAtPriceRange { minVariantPrice { ${MONEY} } maxVariantPrice { ${MONEY} } }
  options { name optionValues { name } }
  variants(first: 100) { nodes { ${VARIANT_FIELDS} } }
  medium: metafield(namespace: "custom", key: "medium") { value }
  dimensions: metafield(namespace: "custom", key: "dimensions") { value }
  year: metafield(namespace: "custom", key: "year") { value }
  framing: metafield(namespace: "custom", key: "framing") { value }
  editionSize: metafield(namespace: "custom", key: "edition_size") { value }
`;

const CART_FIELDS = `
  id checkoutUrl totalQuantity
  cost { subtotalAmount { ${MONEY} } }
  lines(first: 100) {
    nodes {
      id quantity
      cost { totalAmount { ${MONEY} } }
      merchandise {
        ... on ProductVariant {
          ${VARIANT_FIELDS}
          product { id title handle tags }
        }
      }
    }
  }
`;

const PAYLOAD = `cart { ${CART_FIELDS} } userErrors { field message } warnings { code target message }`;

// Prices in pounds, for a UK buyer.
const CONTEXT = '@inContext(country: GB, language: EN)';

export const QUERIES = {
  products: `query Products($after: String) ${CONTEXT} {
    products(first: 100, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes { ${PRODUCT_FIELDS} }
    }
  }`,
  sitePhotos: `query SitePhotos ${CONTEXT} {
    metaobjects(type: "site_photo", first: 100) {
      nodes {
        handle
        fields { key value reference { ... on MediaImage { image { url width height altText } } } }
      }
    }
  }`,
  availability: `query Availability($handle: String!) ${CONTEXT} {
    product(handle: $handle) {
      availableForSale
      variants(first: 100) { nodes { ${VARIANT_FIELDS} } }
    }
  }`,
  cart: `query Cart($id: ID!) ${CONTEXT} { cart(id: $id) { ${CART_FIELDS} } }`,
  cartCreate: `mutation CartCreate($input: CartInput!) ${CONTEXT} { cartCreate(input: $input) { ${PAYLOAD} } }`,
  cartLinesAdd: `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) ${CONTEXT} { cartLinesAdd(cartId: $cartId, lines: $lines) { ${PAYLOAD} } }`,
  cartLinesUpdate: `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) ${CONTEXT} { cartLinesUpdate(cartId: $cartId, lines: $lines) { ${PAYLOAD} } }`,
  cartLinesRemove: `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) ${CONTEXT} { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { ${PAYLOAD} } }`,
};

// ---- Normalising -----------------------------------------------------------------------

/** Storefront connections ({ nodes }) to the plain arrays cart.js works with. */
export function normaliseCart(cart) {
  if (!cart) return null;
  return {
    ...cart,
    lines: (cart.lines?.nodes ?? cart.lines ?? []).filter((l) => l.merchandise?.id),
  };
}

const normalisePayload = (payload) => ({
  cart: normaliseCart(payload.cart),
  userErrors: payload.userErrors ?? [],
  warnings: payload.warnings ?? [],
});

/**
 * site_photo metaobjects → { homeHero, aboutPortrait, studio: [] }.
 * Fields: placement (home-hero | about-portrait | studio), image, alt_text, caption, order.
 */
export function normaliseSitePhotos(nodes = []) {
  const photos = nodes
    .map((node) => {
      const field = (key) => node.fields.find((f) => f.key === key);
      const image = field('image')?.reference?.image;
      if (!image) return null;
      return {
        placement: field('placement')?.value,
        caption: field('caption')?.value ?? null,
        order: Number(field('order')?.value ?? 0),
        image: { ...image, altText: field('alt_text')?.value ?? image.altText ?? '' },
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
  return {
    homeHero: photos.find((p) => p.placement === 'home-hero') ?? null,
    aboutPortrait: photos.find((p) => p.placement === 'about-portrait') ?? null,
    studio: photos.filter((p) => p.placement === 'studio'),
  };
}

// ---- Client ----------------------------------------------------------------------------

/** Same method names and shapes as mock-storefront.js, so cart.js doesn't know the difference. */
export function createStorefrontClient(config) {
  const call = (query, variables) => storefrontRequest(config, query, variables);
  return {
    async cart(id) {
      return normaliseCart((await call(QUERIES.cart, { id })).cart);
    },
    async cartCreate({ lines = [] } = {}) {
      return normalisePayload((await call(QUERIES.cartCreate, { input: { lines } })).cartCreate);
    },
    async cartLinesAdd(cartId, lines) {
      return normalisePayload((await call(QUERIES.cartLinesAdd, { cartId, lines })).cartLinesAdd);
    },
    async cartLinesUpdate(cartId, lines) {
      return normalisePayload(
        (await call(QUERIES.cartLinesUpdate, { cartId, lines })).cartLinesUpdate,
      );
    },
    async cartLinesRemove(cartId, lineIds) {
      return normalisePayload(
        (await call(QUERIES.cartLinesRemove, { cartId, lineIds })).cartLinesRemove,
      );
    },
    /** Live price and stock for a product page. Null if the product has gone. */
    async availability(handle) {
      const { product } = await call(QUERIES.availability, { handle });
      return product
        ? { availableForSale: product.availableForSale, variants: product.variants.nodes }
        : null;
    },
  };
}

/** Shopify cart permalink: straight to checkout, no JS needed. gid://shopify/ProductVariant/123 → /cart/123:1 */
export function cartPermalink(domain, variantId, quantity = 1) {
  return `https://${domain}/cart/${String(variantId).split('/').pop()}:${quantity}`;
}
