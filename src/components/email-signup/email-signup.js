// <email-signup>: validates, posts to the Apps Script in the background, then shows
// "You're on the list." in place. Without JS the form simply posts to the endpoint.

const COPY = {
  empty: 'Enter your email address to sign up.',
  invalid: 'That doesn’t look like a valid email address.',
  failed: 'Something went wrong. Please try again.',
};

class EmailSignup extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.input = this.querySelector('input[type="email"]');
    this.error = this.querySelector('[data-field-error]');
    this.success = this.querySelector('[data-signup-success]');
    this.submit = this.form.querySelector('[type="submit"]');
    this.form.addEventListener('submit', (e) => this.onSubmit(e));
    this.input.addEventListener('input', () => this.showError(''));
  }

  showError(message) {
    this.error.textContent = message;
    this.input.toggleAttribute('aria-invalid', Boolean(message));
    if (message) this.input.setAttribute('aria-invalid', 'true');
  }

  setBusy(busy) {
    this.submit.toggleAttribute('aria-busy', busy);
    this.submit.toggleAttribute('aria-disabled', busy);
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.submit.getAttribute('aria-busy') === 'true') return;
    const value = this.input.value.trim();
    if (!value || !this.input.checkValidity()) {
      this.showError(value ? COPY.invalid : COPY.empty);
      this.input.focus();
      return;
    }
    this.setBusy(true);
    try {
      // Apps Script sends no CORS headers, so the response is opaque. A resolved fetch
      // means Google received it, which is as much as the old site could know too.
      await fetch(this.form.action, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email: value }),
      });
      this.showSuccess();
    } catch {
      this.showError(COPY.failed);
    } finally {
      this.setBusy(false);
    }
  }

  showSuccess() {
    const check = this.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
    check.setAttribute('class', 'ds-icon ds-icon--md');
    check.setAttribute('aria-hidden', 'true');
    check.innerHTML = '<use href="#ds-icon-check"></use>';
    const title = Object.assign(document.createElement('p'), {
      className: 'ds-email-signup__success-title',
      textContent: 'You’re on the list.',
    });
    const note = Object.assign(document.createElement('p'), {
      textContent: 'I’ll send the next one straight to your inbox.',
    });
    this.success.replaceChildren(check, title, note);
    this.dataset.state = 'success';
  }
}

customElements.define('email-signup', EmailSignup);
