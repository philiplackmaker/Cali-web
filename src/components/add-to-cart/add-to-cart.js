// <add-to-cart>: submits the product form to the cart store and opens the drawer.
// Handles loading, sold-out variants, originals already in the basket, and the
// shop being unreachable.
import { getCartStore, openCart } from '../../scripts/commerce.js';

class AddToCart extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.button = this.querySelector('[data-add-to-cart-button]');
    this.message = this.querySelector('[data-add-to-cart-message]');
    if (!this.button) return; // a sold original: nothing to do
    this.label = this.button.querySelector('.ds-button__label');
    this.available = !this.button.disabled;

    this.form.addEventListener('submit', (e) => this.onSubmit(e));
    this.addEventListener('variant:change', (e) => {
      this.available = e.detail.variant.availableForSale;
      this.render();
    });
    // <product-live> couldn't load the catalogue to check stock: pause buying until it can.
    (this.closest('[data-product]') ?? this).addEventListener('product:offline', (e) => {
      this.offline = e.detail.message;
      this.render();
    });
    (this.closest('[data-product]') ?? this).addEventListener('product:availability', (e) => {
      this.offline = null;
      if (this.hasAttribute('data-original')) this.available = e.detail.availableForSale;
      this.render();
    });

    getCartStore().then((store) => {
      this.store = store;
      store.events.addEventListener('change', () => this.render());
      this.render();
    });
  }

  get variantId() {
    return this.form.querySelector('input[name="id"]').value;
  }

  get inBasket() {
    return (
      this.hasAttribute('data-original') &&
      Boolean(this.store?.cart?.lines.some((l) => l.merchandise.id === this.variantId))
    );
  }

  render({ busy = false, error = this.offline ?? '' } = {}) {
    const inBasket = this.inBasket;
    this.button.toggleAttribute(
      'disabled',
      !busy && (!this.available || inBasket || Boolean(this.offline)),
    );
    this.button.toggleAttribute('aria-busy', busy);
    this.button.toggleAttribute('aria-disabled', busy);
    let spinner = this.button.querySelector('.ds-button__spinner');
    if (busy && !spinner) {
      spinner = Object.assign(document.createElement('span'), { className: 'ds-button__spinner' });
      spinner.setAttribute('aria-hidden', 'true');
      this.button.prepend(spinner);
    } else if (!busy) spinner?.remove();
    this.label.textContent = busy
      ? 'Adding…'
      : !this.available
        ? 'Sold out'
        : inBasket
          ? 'In your basket'
          : 'Add to basket';

    this.message.classList.toggle('ds-add-to-cart__message--error', Boolean(error));
    if (error) this.message.textContent = error;
    else if (inBasket) {
      this.message.innerHTML = '<a href="/cart/" data-cart-open>View your basket</a>';
    } else this.message.textContent = '';
  }

  async onSubmit(event) {
    event.preventDefault();
    if (!this.store || this.button.getAttribute('aria-busy') === 'true') return;
    const quantity = Number(this.form.querySelector('input[name="quantity"]')?.value ?? 1);
    this.render({ busy: true });
    try {
      await this.store.add(this.variantId, quantity);
      this.render();
      if (!(await openCart())) location.href = '/cart/';
    } catch (error) {
      this.render({ error: error.message });
    }
  }
}

customElements.define('add-to-cart', AddToCart);
