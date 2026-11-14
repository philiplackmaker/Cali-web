// The cart: one shared store over a basket client (local-cart.js), in the shapes the site
// first used with Shopify's Storefront API.
// Every change emits a "change" event with { cart, message, warning }: message is
// copy in Cali's voice for the aria-live region (or null), and warning is true when a
// line came back sold or short of stock.

const CART_KEY = 'ds-cart-id';

export const COPY = {
  added: (title) => `Added ${title} to your basket.`,
  updated: 'Basket updated.',
  removed: (title) => `Removed ${title} from your basket.`,
  soldOut: (title) => `Sorry, ${title} has just sold, so I’ve taken it out of your basket.`,
  notEnough: (title) =>
    `There aren’t as many of ${title} left as you asked for, so I’ve added what’s left.`,
  offline: 'I can’t reach the shop just now. Please try again in a minute.',
};

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    s.getItem('x');
    return s;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
  }
}

const titleOf = (line) =>
  line?.merchandise?.product?.title
    ? `“${line.merchandise.product.title}”${
        line.merchandise.title && line.merchandise.title !== 'Default Title'
          ? ` (${line.merchandise.title})`
          : ''
      }`
    : 'that piece';

/** Turns stock warnings into one message. Lines that come back unavailable win. */
function warningMessage(warnings = [], lines = []) {
  const byId = new Map(lines.map((l) => [l.merchandise.id, l]));
  for (const w of warnings) {
    const line = byId.get(w.target) ?? lines.find((l) => l.id === w.target);
    if (w.code === 'MERCHANDISE_OUT_OF_STOCK') return COPY.soldOut(titleOf(line));
    if (w.code === 'MERCHANDISE_NOT_ENOUGH_STOCK') return COPY.notEnough(titleOf(line));
  }
  return null;
}

export function createCartStore({ client, storage = safeStorage(), key = CART_KEY } = {}) {
  const events = new EventTarget();
  let cart = null;
  let queue = Promise.resolve();
  // Remember lines so a "sold" warning can still name a line that has just been dropped.
  let knownLines = [];

  const emit = (message = null, warning = false) => {
    events.dispatchEvent(new CustomEvent('change', { detail: { cart, message, warning } }));
  };

  const setCart = (next) => {
    cart = next;
    if (cart?.id) storage.setItem(key, cart.id);
    else storage.removeItem(key);
    knownLines = [...(cart?.lines ?? []), ...knownLines].slice(0, 50);
  };

  // Run operations one at a time so fast clicks can’t race each other.
  const run = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };

  const handle = (result, success) => {
    if (result.userErrors?.length) throw new Error(result.userErrors[0].message);
    setCart(result.cart);
    const warning = warningMessage(result.warnings, knownLines);
    emit(warning ?? success, Boolean(warning));
    return { cart, message: warning ?? success, warning: Boolean(warning) };
  };

  const fail = (error) => {
    events.dispatchEvent(new CustomEvent('error', { detail: { error, message: COPY.offline } }));
    const wrapped = new Error(COPY.offline, { cause: error });
    throw wrapped;
  };

  return {
    events,
    get cart() {
      return cart;
    },
    get count() {
      return cart?.totalQuantity ?? 0;
    },

    /** Restores the saved cart, if any. */
    load: () =>
      run(async () => {
        const id = storage.getItem(key);
        if (!id) {
          emit();
          return null;
        }
        try {
          setCart(await client.cart(id));
          // Something sold since this basket was last seen: take it out and say so.
          const gone = cart?.lines.filter((l) => l.merchandise.availableForSale === false) ?? [];
          if (gone.length) {
            const result = await client.cartLinesRemove(
              cart.id,
              gone.map((l) => l.id),
            );
            setCart(result.cart);
            emit(COPY.soldOut(titleOf(gone[0])), true);
            return cart;
          }
        } catch (error) {
          return fail(error);
        }
        emit();
        return cart;
      }),

    add: (merchandiseId, quantity = 1) =>
      run(async () => {
        try {
          const lines = [{ merchandiseId, quantity }];
          const result = cart?.id
            ? await client.cartLinesAdd(cart.id, lines)
            : await client.cartCreate({ lines });
          const line = result.cart?.lines.find((l) => l.merchandise.id === merchandiseId);
          return handle(result, COPY.added(titleOf(line)));
        } catch (error) {
          return fail(error);
        }
      }),

    update: (lineId, quantity) =>
      run(async () => {
        if (quantity <= 0) return removeLine(lineId);
        try {
          return handle(
            await client.cartLinesUpdate(cart.id, [{ id: lineId, quantity }]),
            COPY.updated,
          );
        } catch (error) {
          return fail(error);
        }
      }),

    remove: (lineId) => run(() => removeLine(lineId)),

    /** Empties the basket: after a paid checkout (the /order-thanks/ page). */
    clear: () =>
      run(async () => {
        setCart(null);
        emit();
        return null;
      }),
  };

  async function removeLine(lineId) {
    const line = cart?.lines.find((l) => l.id === lineId);
    try {
      return handle(await client.cartLinesRemove(cart.id, [lineId]), COPY.removed(titleOf(line)));
    } catch (error) {
      return fail(error);
    }
  }
}
