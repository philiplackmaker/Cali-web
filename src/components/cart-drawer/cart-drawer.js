// <cart-drawer>: shows the cart in a modal <dialog>. The dialog keeps focus inside,
// Esc closes it, and focus goes back to whatever opened it. Line edits go through the
// cart store; every change is announced in an aria-live region.
import { getCartStore } from '../../scripts/commerce.js';
import { formatMoney } from '../../scripts/lib/money.js';
import { imageUrl, srcset, widthsFor } from '../../scripts/lib/image.js';
import '../quantity-input/quantity-input.js';

const isOriginal = (line) => line.merchandise.product.tags?.includes('original');

export function renderLines(list, template, cart) {
  const lines = cart?.lines ?? [];
  const existing = new Map([...list.children].map((li) => [li.dataset.lineId, li]));
  const next = lines.map((line) => {
    const li = existing.get(line.id) ?? template.content.firstElementChild.cloneNode(true);
    fillLine(li, line);
    return li;
  });
  list.replaceChildren(...next);
}

function fillLine(li, line) {
  const { merchandise: m } = line;
  li.dataset.lineId = line.id;
  const img = li.querySelector('[data-line-image]');
  if (m.image) {
    img.sizes = '4.5rem'; // --ds-layout-thumb: the sizes attribute can't read CSS variables
    img.srcset = srcset(m.image);
    img.src = imageUrl(m.image.url, widthsFor(m.image)[0]);
    img.hidden = false;
  } else img.hidden = true;

  const title = li.querySelector('[data-line-title]');
  title.textContent = m.product.title;
  title.href = `/shop/${m.product.handle}/`;
  li.querySelector('[data-line-variant]').textContent =
    m.title === 'Default Title' ? 'Original' : m.title;
  li.querySelector('[data-line-unit]').textContent =
    line.quantity > 1 ? `${formatMoney(m.price)} each` : '';
  li.querySelector('[data-line-total]').textContent = formatMoney(line.cost.totalAmount);

  const original = isOriginal(line);
  li.querySelector('[data-line-quantity]').hidden = original;
  li.querySelector('[data-line-one-off]').hidden = !original;
  const input = li.querySelector('input[type="number"]');
  const id = `line-qty-${line.id.split('/').pop()}`;
  input.id = id;
  li.querySelector('.ds-quantity__label').htmlFor = id;
  li.querySelector('.ds-quantity__label').textContent = `Quantity of ${m.product.title}`;
  for (const b of li.querySelectorAll('[data-step]')) {
    b.setAttribute(
      'aria-label',
      `${b.dataset.step < 0 ? 'Decrease' : 'Increase'} quantity of ${m.product.title}`,
    );
  }
  if (document.activeElement !== input) input.value = line.quantity;
  li.querySelector('quantity-input')?.sync?.();
  li.querySelector('[data-line-remove] .ds-button__label').textContent = 'Remove';
  li.querySelector('[data-line-remove]').setAttribute('aria-label', `Remove ${m.product.title}`);
}

class CartDrawer extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.list = this.querySelector('[data-cart-lines]');
    this.template = this.querySelector('[data-cart-line-template]');
    this.body = this.querySelector('[data-cart-body]');
    this.empty = this.querySelector('[data-cart-empty]');
    this.footer = this.querySelector('[data-cart-footer]');
    this.subtotal = this.querySelector('[data-cart-subtotal]');
    this.checkout = this.querySelector('[data-cart-checkout]');
    this.checkoutLines = this.querySelector('[data-cart-checkout-lines]');
    this.notice = this.querySelector('[data-cart-notice]');
    this.announcer = this.querySelector('[data-cart-announcer]');

    // Inline (the /cart/ page): no dialog to open or close, and basket links just go to /cart/.
    this.inline = this.hasAttribute('data-inline');
    if (!this.inline) {
      this.querySelector('[data-cart-close]').addEventListener('click', () => this.close());
      // Click on the backdrop (outside the panel) closes.
      this.dialog.addEventListener('click', (e) => {
        if (e.target === this.dialog) this.close();
      });
      document.addEventListener('click', (e) => {
        const opener = e.target.closest('[data-cart-open]');
        if (!opener || this.dialog.contains(opener)) return;
        e.preventDefault();
        this.open();
      });
    }

    this.list.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-line-remove]');
      if (remove) this.edit(remove.closest('[data-line-id]').dataset.lineId, 0);
    });
    this.list.addEventListener('change', (e) => {
      if (!e.target.matches('input[type="number"]')) return;
      const lineId = e.target.closest('[data-line-id]').dataset.lineId;
      clearTimeout(this.debounce);
      this.debounce = setTimeout(() => this.edit(lineId, e.target.valueAsNumber), 350);
    });

    getCartStore().then((store) => {
      this.store = store;
      store.events.addEventListener('change', (e) => this.render(e.detail));
      store.events.addEventListener('error', (e) => this.showNotice(e.detail.message, true));
      this.render({ cart: store.cart });
    });
  }

  open() {
    if (this.inline) return this.scrollIntoView();
    if (!this.dialog.open) this.dialog.showModal();
  }

  close() {
    if (!this.inline) this.dialog.close();
  }

  async edit(lineId, quantity) {
    this.body.setAttribute('aria-busy', 'true');
    try {
      await this.store.update(lineId, quantity);
    } catch {
      // The error event has shown the notice; put the quantities back without clearing it.
      this.render({ cart: this.store.cart, keepNotice: true });
    } finally {
      this.body.removeAttribute('aria-busy');
    }
  }

  showNotice(message, error = false) {
    this.notice.hidden = !message;
    this.notice.textContent = message ?? '';
    this.notice.classList.toggle('ds-cart-drawer__notice--error', error);
    if (message) this.announce(message);
  }

  announce(message) {
    // Clear first so the same message twice is still read out.
    this.announcer.textContent = '';
    // (A timeout rather than requestAnimationFrame, which background tabs skip.)
    clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => (this.announcer.textContent = message), 100);
  }

  render({ cart, message, warning, keepNotice = false } = {}) {
    const hasLines = Boolean(cart?.lines.length);
    renderLines(this.list, this.template, cart);
    this.empty.hidden = hasLines;
    this.footer.hidden = !hasLines;
    if (hasLines) {
      this.subtotal.textContent = formatMoney(cart.cost.subtotalAmount);
      this.checkout.action = cart.checkoutUrl;
      this.checkoutLines.replaceChildren(
        ...cart.lines.flatMap((line) => [
          Object.assign(document.createElement('input'), {
            type: 'hidden',
            name: 'id',
            value: line.merchandise.id,
          }),
          Object.assign(document.createElement('input'), {
            type: 'hidden',
            name: 'quantity',
            value: line.quantity,
          }),
        ]),
      );
    }
    // Sold or short-stock warnings stay visible; routine messages are only announced.
    if (warning) this.showNotice(message);
    else if (!keepNotice) {
      this.notice.hidden = true;
      if (message) this.announce(message);
    }
  }
}

customElements.define('cart-drawer', CartDrawer);
