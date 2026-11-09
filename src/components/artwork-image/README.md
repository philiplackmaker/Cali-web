# Artwork image

Responsive painting images: a `srcset` from Shopify CDN widths (never upscaled), real width and height, and lazy loading unless `priority`.

```njk
{% from "components/artwork-image/artwork-image.njk" import artworkImage %}
{{ artworkImage(image, { priority: true, sizes: "(width >= 53.75rem) 50vw, 100vw" }) }}
{{ artworkImage(image, { framed: true, alt: "" }) }}
```

- **framed** shows the whole painting inside the card frame (`--ds-product-card-image-ratio`) on the wall colour. Paintings are never cropped.
- **URL logic:** `src/scripts/lib/image.js`, shared with the browser and unit-tested.

Docs: `/design-system/components/artwork-image/`
