// <variant-picker>: turns the option radios into a variant. On change it sets the form's
// hidden "id", updates the price, marks sold-out combinations, keeps ?variant= in the URL,
// and fires "variant:change" (bubbling, detail: { variant }) for the gallery and add-to-cart.
import { describePrice, priceInnerHtml } from '../../scripts/lib/money.js';
import { findVariant } from '../../scripts/lib/product.js';

const numericId = (gid) => gid.split('/').pop();

class VariantPicker extends HTMLElement {
  connectedCallback() {
    this.variants = JSON.parse(this.querySelector('script[data-variants]').textContent);
    this.product = this.closest('[data-product]') ?? document;
    this.addEventListener('change', (e) => {
      if (e.target.matches('input[type="radio"]')) this.update();
    });
    this.selectFromUrl();
    this.update({ initial: true });
  }

  /** Swap in live variant data (price, stock) from Shopify and re-check everything. */
  setVariants(variants) {
    this.variants = variants;
    this.update({ initial: true });
  }

  get choices() {
    return Object.fromEntries(
      [...this.querySelectorAll('input[type="radio"]:checked')].map((i) => [
        i.dataset.option,
        i.value,
      ]),
    );
  }

  findVariant(choices) {
    return findVariant(this.variants, choices);
  }

  selectFromUrl() {
    const wanted = new URLSearchParams(location.search).get('variant');
    const variant = wanted && this.variants.find((v) => numericId(v.id) === wanted);
    if (!variant) return;
    for (const { name, value } of variant.selectedOptions) {
      const input = this.querySelector(
        `input[data-option="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`,
      );
      if (input) input.checked = true;
    }
  }

  update({ initial = false } = {}) {
    const choices = this.choices;
    const variant = this.findVariant(choices);
    this.markAvailability(choices);
    if (!variant) return;

    const form = this.closest('form');
    const idInput = form?.querySelector('input[name="id"]');
    if (idInput) idInput.value = variant.id;

    const price = this.product.querySelector('[data-price]');
    if (price) {
      const view = describePrice(variant);
      price.innerHTML = priceInnerHtml(view);
      price.classList.toggle('ds-price--sale', view.onSale);
    }

    if (!initial) {
      const url = new URL(location.href);
      url.searchParams.set('variant', numericId(variant.id));
      history.replaceState(history.state, '', url);
    }

    this.dispatchEvent(new CustomEvent('variant:change', { bubbles: true, detail: { variant } }));
  }

  // A value is "sold out" if no available variant has it, keeping the other choices as they are.
  markAvailability(choices) {
    for (const input of this.querySelectorAll('input[type="radio"]')) {
      const test = { ...choices, [input.dataset.option]: input.value };
      const variant = this.findVariant(test);
      const available = Boolean(variant?.availableForSale);
      const label = input.closest('label');
      label.classList.toggle('ds-variant-picker__value--unavailable', !available);
      let note = label.querySelector('.ds-visually-hidden');
      if (!available && !note) {
        note = Object.assign(document.createElement('span'), {
          className: 'ds-visually-hidden',
          textContent: ' (sold out)',
        });
        label.querySelector('span').append(note);
      } else if (available && note) {
        note.remove();
      }
    }
  }
}

customElements.define('variant-picker', VariantPicker);
