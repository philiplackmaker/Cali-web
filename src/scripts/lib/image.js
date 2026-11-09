// Responsive image URLs. Shopify's CDN resizes on request with ?width=N.
// Mock images use a "{width}" placeholder in the URL instead.

export const WIDTHS = [320, 480, 640, 800, 1080, 1440, 1920];

export function imageUrl(url, width) {
  if (url.includes('{width}')) return url.replace('{width}', width);
  if (/^https:\/\/cdn\.shopify\.com\//.test(url) || /\/cdn\/shop\//.test(url)) {
    const u = new URL(url);
    u.searchParams.set('width', width);
    return u.toString();
  }
  return url;
}

/** Never upscales: widths stop at the source image's own width, which is always included. */
export function widthsFor(image, widths = WIDTHS) {
  const fit = widths.filter((w) => w < image.width);
  return [...fit, image.width];
}

export function srcset(image, widths = WIDTHS) {
  return widthsFor(image, widths)
    .map((w) => `${imageUrl(image.url, w)} ${w}w`)
    .join(', ');
}
