// <product-gallery>: thumbnails switch the main image; "View larger" opens a full-screen
// <dialog> with arrow-key navigation. Follows variant:change to show the variant's image.

class ProductGallery extends HTMLElement {
  connectedCallback() {
    this.slides = [...this.querySelectorAll('[data-gallery-slide]')];
    this.thumbs = [...this.querySelectorAll('[data-gallery-thumb]')];
    this.viewer = this.querySelector('[data-gallery-viewer]');
    this.viewerImg = this.querySelector('[data-gallery-viewer-img]');
    this.viewerCount = this.querySelector('[data-gallery-viewer-count]');
    this.index = 0;

    const zoom = this.querySelector('[data-gallery-zoom]');
    zoom.hidden = false;
    zoom.addEventListener('click', () => this.openViewer());

    this.thumbs.forEach((thumb, i) =>
      thumb.addEventListener('click', (e) => {
        e.preventDefault();
        this.show(i);
      }),
    );

    this.querySelector('[data-gallery-close]').addEventListener('click', () => this.viewer.close());
    this.querySelector('[data-gallery-prev]')?.addEventListener('click', () => this.step(-1));
    this.querySelector('[data-gallery-next]')?.addEventListener('click', () => this.step(1));
    this.viewer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.step(-1);
      if (e.key === 'ArrowRight') this.step(1);
    });
    this.viewer.addEventListener('close', () => this.show(this.index));

    const product = this.closest('[data-product]') ?? document;
    product.addEventListener('variant:change', (e) => {
      const id = e.detail.variant.image?.id;
      const i = this.slides.findIndex((s) => s.dataset.imageId === id);
      if (i >= 0) this.show(i);
    });
  }

  show(i) {
    this.index = (i + this.slides.length) % this.slides.length;
    this.slides.forEach((s, n) => (s.hidden = n !== this.index));
    this.thumbs.forEach((t, n) =>
      n === this.index ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current'),
    );
    if (this.viewer.open) this.fillViewer();
  }

  step(delta) {
    this.show(this.index + delta);
  }

  fillViewer() {
    const img = this.slides[this.index].querySelector('img');
    this.viewerImg.src = img.currentSrc || img.src;
    // Ask for the biggest version for the full-screen view.
    const largest = img.srcset.split(',').at(-1)?.trim().split(' ')[0];
    if (largest) this.viewerImg.src = largest;
    this.viewerImg.alt = img.alt;
    this.viewerImg.width = Number(img.getAttribute('width'));
    this.viewerImg.height = Number(img.getAttribute('height'));
    this.viewerCount.textContent =
      this.slides.length > 1 ? `Image ${this.index + 1} of ${this.slides.length}` : '';
  }

  openViewer() {
    this.fillViewer();
    this.viewer.showModal();
  }
}

customElements.define('product-gallery', ProductGallery);
