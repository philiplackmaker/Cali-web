// <error-banner>: shows itself with the cart store's message when the shop's catalogue can't be loaded.
import { getCartStore } from '../../scripts/commerce.js';

class ErrorBanner extends HTMLElement {
  connectedCallback() {
    getCartStore().then((store) => {
      store.events.addEventListener('error', (e) => {
        this.querySelector('[data-error-message]').textContent = e.detail.message;
        this.hidden = false;
      });
      // A successful change means we're back in touch.
      store.events.addEventListener('change', () => (this.hidden = true));
    });
  }
}

customElements.define('error-banner', ErrorBanner);
