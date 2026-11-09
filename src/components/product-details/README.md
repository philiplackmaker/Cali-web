# Product details

The wall label for a product page: medium, size, year, framing and edition, each from a Shopify metafield and shown only when filled in. Originals also list `site.originalPromises` (signed, certificate, insured delivery). Cali needs to confirm those before launch.

```njk
{% from "components/product-details/product-details.njk" import productDetails %}
{{ productDetails(product) }}
```

Docs: `/design-system/components/product-details/`
