// Loads each component's JS only on pages that use it. Pages read fine before this runs.
const COMPONENTS = {
  'email-signup': '../components/email-signup/email-signup.js',
  'quantity-input': '../components/quantity-input/quantity-input.js',
  'variant-picker': '../components/variant-picker/variant-picker.js',
  'add-to-cart': '../components/add-to-cart/add-to-cart.js',
  'cart-drawer': '../components/cart-drawer/cart-drawer.js',
  'cart-count': '../components/header/cart-count.js',
  'theme-toggle': '../components/header/theme-toggle.js',
  'product-gallery': '../components/product-gallery/product-gallery.js',
  'product-live': '../components/product-live/product-live.js',
  'video-clip': '../components/video-clip/video-clip.js',
  'error-banner': '../patterns/error-banner/error-banner.js',
  'enquiry-form': '../patterns/enquiry-form/enquiry-form.js',
};

for (const [tag, path] of Object.entries(COMPONENTS)) {
  if (document.querySelector(tag)) import(new URL(path, import.meta.url).href);
}
