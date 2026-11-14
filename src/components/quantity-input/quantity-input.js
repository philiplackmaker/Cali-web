// <quantity-input>: − and + buttons around a number input, clamped to min and max.
// Fires a normal bubbling "change" event from the input whenever the value changes.
// Keyboard users use the input itself (arrow keys, typing); the buttons are for pointers,
// so they're skipped in the tab order.

class QuantityInput extends HTMLElement {
  connectedCallback() {
    // Cart lines get moved around when they re-render: only wire up once.
    if (this.input) return this.sync();
    this.input = this.querySelector('input');
    this.buttons = [...this.querySelectorAll('[data-step]')];
    this.buttons.forEach((b) =>
      b.addEventListener('click', () => this.step(Number(b.dataset.step))),
    );
    this.input.addEventListener('change', () => {
      this.input.value = this.clamp(this.input.valueAsNumber);
      this.sync();
    });
    this.sync();
  }

  get min() {
    return Number(this.input.min || 0);
  }

  get max() {
    return Number(this.input.max || Infinity);
  }

  clamp(n) {
    return Math.min(this.max, Math.max(this.min, Number.isFinite(n) ? Math.round(n) : this.min));
  }

  step(delta) {
    const next = this.clamp(this.input.valueAsNumber + delta);
    if (next === this.input.valueAsNumber) return;
    this.input.value = next;
    this.sync();
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  sync() {
    const [down, up] = this.buttons;
    const disabled = this.input.disabled;
    down.disabled = disabled || this.input.valueAsNumber <= this.min;
    up.disabled = disabled || this.input.valueAsNumber >= this.max;
  }
}

customElements.define('quantity-input', QuantityInput);
