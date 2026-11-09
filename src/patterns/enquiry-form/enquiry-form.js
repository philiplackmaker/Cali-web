// <enquiry-form>: fills in the topic and painting from ?about= or ?viewing=, and checks
// required fields before sending, with messages in Cali's voice. Netlify does the sending.

const COPY = {
  name: 'Tell me your name, so I know who I’m writing to.',
  email: 'Enter your email address, so I can reply.',
  emailInvalid: 'That doesn’t look like a valid email address.',
  message: 'Write a few words about what you’re after.',
};

class EnquiryForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    const params = new URLSearchParams(location.search);
    const handle = params.get('viewing') ?? params.get('about');
    if (handle) {
      const painting = this.form.elements.painting;
      if ([...painting.options].some((o) => o.value === handle)) painting.value = handle;
      this.form.elements.topic.value = params.has('viewing') ? 'viewing' : 'painting';
    }
    this.form.noValidate = true;
    this.form.addEventListener('submit', (e) => this.validate(e));
    this.form.addEventListener('input', (e) => this.setError(e.target, ''));
  }

  setError(field, message) {
    const error = this.querySelector(`#${CSS.escape(field.id)}-error`);
    if (!error) return;
    error.textContent = message;
    if (message) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  validate(event) {
    const { name, email, message } = this.form.elements;
    const problems = [
      [name, name.value.trim() ? '' : COPY.name],
      [email, !email.value.trim() ? COPY.email : email.validity.valid ? '' : COPY.emailInvalid],
      [message, message.value.trim() ? '' : COPY.message],
    ];
    for (const [field, text] of problems) this.setError(field, text);
    const first = problems.find(([, text]) => text);
    if (first) {
      event.preventDefault();
      first[0].focus();
    }
  }
}

customElements.define('enquiry-form', EnquiryForm);
