# Product gallery `<product-gallery>`

The main image, thumbnails, and a full-screen viewer (`<dialog>`, ← → to move, Esc to close). Without JS, the thumbnails link to the full-size files.

```njk
{% from "components/product-gallery/product-gallery.njk" import productGallery %}
{{ productGallery(product) }}
```

It follows `variant:change` inside the same `data-product` element. The first image loads with `fetchpriority="high"`, because it's the product page's LCP image.

Docs: `/design-system/components/product-gallery/`
