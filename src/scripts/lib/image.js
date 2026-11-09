// Responsive image URLs. Images are made at build time in fixed widths, and their URL has a
// "{width}" placeholder: /assets/images/art/swan-1-{width}.webp.

export const WIDTHS = [320, 480, 640, 800, 1080, 1440, 1920];

export function imageUrl(url, width) {
  if (url.includes('{width}')) return url.replace('{width}', width);
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
