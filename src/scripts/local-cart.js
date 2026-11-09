// The basket, kept in the browser. Prices and stock come from the built catalogue
// (/assets/data/catalog.json), so they're whatever the last build read from the sheet.
// Payment happens at Stripe: the basket's checkoutUrl is where the checkout form posts.
// Responses keep the shape cart.js expects:
// { cart, userErrors: [], warnings: [{ code, target, message }] }.
// Stock is enforced: originals have quantityAvailable 1, sold variants 0.

let seq = 0;
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export function createLocalCart({
  catalog,
  storage,
  key = 'ds-carts',
  checkoutUrl = '/api/checkout',
  latency = 0,
  fail = () => false,
}) {
  const load = () => JSON.parse(storage.getItem(key) ?? '{}');
  const save = (carts) => storage.setItem(key, JSON.stringify(carts));
  const wait = () => new Promise((r) => setTimeout(r, latency));
  const variant = async (id) => (await catalog())[id];

  async function build(stored) {
    const lines = [];
    for (const l of stored.lines) {
      const v = await variant(l.merchandiseId);
      if (!v) continue;
      lines.push({
        id: l.id,
        quantity: l.quantity,
        merchandise: v,
        cost: {
          totalAmount: {
            amount: (Number(v.price.amount) * l.quantity).toFixed(2),
            currencyCode: v.price.currencyCode,
          },
        },
      });
    }
    const currencyCode = lines[0]?.merchandise.price.currencyCode ?? 'GBP';
    const subtotal = lines.reduce((sum, l) => sum + Number(l.cost.totalAmount.amount), 0);
    return {
      id: stored.id,
      checkoutUrl,
      totalQuantity: lines.reduce((n, l) => n + l.quantity, 0),
      cost: { subtotalAmount: { amount: subtotal.toFixed(2), currencyCode } },
      lines,
    };
  }

  // Caps each line at what's in stock and drops sold lines, reporting warnings.
  async function reconcile(stored) {
    const warnings = [];
    const kept = [];
    for (const l of stored.lines) {
      const v = await variant(l.merchandiseId);
      const available = v?.availableForSale ? (v.quantityAvailable ?? Infinity) : 0;
      if (available <= 0) {
        warnings.push({
          code: 'MERCHANDISE_OUT_OF_STOCK',
          target: l.merchandiseId,
          message: 'Sold out',
        });
        continue;
      }
      if (l.quantity > available) {
        warnings.push({
          code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
          target: l.merchandiseId,
          message: 'Not enough stock',
        });
        l.quantity = available;
      }
      kept.push(l);
    }
    stored.lines = kept;
    return warnings;
  }

  async function respond(stored) {
    const warnings = await reconcile(stored);
    const carts = load();
    carts[stored.id] = stored;
    save(carts);
    return { cart: await build(stored), userErrors: [], warnings };
  }

  async function guard(op) {
    await wait();
    if (fail(op)) throw new Error(`Shop catalogue unavailable (${op})`);
  }

  function getStored(id) {
    const stored = load()[id];
    if (!stored) throw new Error(`No cart ${id}`);
    return stored;
  }

  function addTo(stored, lines) {
    for (const { merchandiseId, quantity = 1 } of lines) {
      const existing = stored.lines.find((l) => l.merchandiseId === merchandiseId);
      if (existing) existing.quantity += quantity;
      else stored.lines.push({ id: uid('line'), merchandiseId, quantity });
    }
  }

  return {
    // A plain cart read reports no warnings: a sold line just comes back
    // with availableForSale: false, and the cart store deals with it.
    async cart(id) {
      await guard('cart');
      const stored = load()[id];
      return stored ? build(stored) : null;
    },
    async cartCreate({ lines = [] } = {}) {
      await guard('cartCreate');
      const stored = { id: uid('cart'), lines: [] };
      addTo(stored, lines);
      return respond(stored);
    },
    async cartLinesAdd(id, lines) {
      await guard('cartLinesAdd');
      const stored = getStored(id);
      addTo(stored, lines);
      return respond(stored);
    },
    async cartLinesUpdate(id, lines) {
      await guard('cartLinesUpdate');
      const stored = getStored(id);
      for (const { id: lineId, quantity } of lines) {
        const line = stored.lines.find((l) => l.id === lineId);
        if (line) line.quantity = quantity;
      }
      stored.lines = stored.lines.filter((l) => l.quantity > 0);
      return respond(stored);
    },
    async availability(handle) {
      await guard('availability');
      const variants = Object.values(await catalog()).filter((v) => v.product.handle === handle);
      if (!variants.length) return null;
      return { availableForSale: variants.some((v) => v.availableForSale), variants };
    },
    async cartLinesRemove(id, lineIds) {
      await guard('cartLinesRemove');
      const stored = getStored(id);
      stored.lines = stored.lines.filter((l) => !lineIds.includes(l.id));
      return respond(stored);
    },
  };
}
