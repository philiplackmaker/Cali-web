// <product-live data-handle="…">: checks price and stock against the catalogue when a product
// page opens (and the docs' "sold" demo).
// - Prints: hands fresh variants to <variant-picker>, which re-marks sold-out options.
// - Originals: updates the price; if it has sold, swaps in the sold notice.
// - Catalogue unreachable: fires product:offline, and <add-to-cart> pauses with a message.
import { getClient } from '../../scripts/commerce.js';
import { describePrice, priceInnerHtml } from '../../scripts/lib/money.js';

const OFFLINE =
  'I can’t check what’s available just now, so buying is paused. Please try again in a minute.';

class ProductLive extends HTMLElement {
  async connectedCallback() {
    this.product = this.closest('[data-product]');
    if (!this.product) return;
    let live;
    try {
      const client = await getClient();
      live = await client.availability(this.dataset.handle);
    } catch {
      this.emit('product:offline', { message: OFFLINE });
      return;
    }
    const availableForSale = Boolean(live?.availableForSale);
    const variants = live?.variants ?? [];

    const picker = this.product.querySelector('variant-picker');
    if (picker && variants.length) {
      await customElements.whenDefined('variant-picker');
      picker.setVariants(variants);
    } else if (variants[0]) {
      const price = this.product.querySelector('[data-price]:not(.ds-price--on-request)');
      if (price) price.innerHTML = priceInnerHtml(describePrice(variants[0]));
    }

    const soldTemplate = this.product.querySelector('template[data-sold-template]');
    if (!availableForSale && soldTemplate) {
      this.product
        .querySelector('[data-buy]')
        ?.replaceChildren(soldTemplate.content.cloneNode(true));
      const badges = this.product.querySelector('.ds-badges');
      if (badges && !badges.querySelector('.ds-badge--sold')) {
        badges.insertAdjacentHTML(
          'afterbegin',
          '<li><span class="ds-badge ds-badge--sold">Sold</span></li>',
        );
      }
    }
    this.emit('product:availability', { availableForSale, variants });
  }

  emit(type, detail) {
    this.product.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

customElements.define('product-live', ProductLive);
