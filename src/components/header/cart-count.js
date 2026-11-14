// <cart-count>: the number on the header's basket link. Gives the link an accessible
// name like "Basket, 2 items" and hides itself when the basket is empty.
import { getCartStore } from '../../scripts/commerce.js';

class CartCount extends HTMLElement {
  connectedCallback() {
    this.link = this.closest('a');
    getCartStore().then((store) => {
      const render = () => {
        const n = store.count;
        this.hidden = n === 0;
        this.textContent = n;
        this.setAttribute('aria-hidden', 'true');
        this.link?.setAttribute(
          'aria-label',
          n ? `Basket, ${n} ${n === 1 ? 'item' : 'items'}` : 'Basket, empty',
        );
      };
      store.events.addEventListener('change', render);
      render();
    });
  }
}

customElements.define('cart-count', CartCount);
