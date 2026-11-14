# Product detail

Gallery beside the wall label: price, buying, details and delivery.

```njk
{% from "patterns/product-detail/product-detail.njk" import productDetail %}
{{ productDetail(product) }}
```

- **Used on:** /shop/{handle}/
- Handles originals, prints (variant picker and quantity), sold work (sold notice), and price on request. On wide screens the painting stays in view while you scroll the details.

Docs: `/design-system/patterns/product-detail/`
