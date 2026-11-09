# Product live `<product-live>`

Checks a product's live price and stock with the Storefront API when its page opens (`client.availability(handle)` in `src/scripts/shopify-client.js`, which is the brief's `shopify-client.js`). Product pages are static, built at deploy time, so this catches anything that changed since then.

- **Prints:** gives fresh variants to `<variant-picker>`, which re-marks sold-out options and updates the price.
- **Originals:** updates the price. If the painting has sold, it swaps `[data-buy]` for the `<template data-sold-template>` (the sold notice).
- **Shopify unreachable:** fires `product:offline`, and `<add-to-cart>` disables with a short message. The static page still reads fine.

```njk
{% from "components/product-live/product-live.njk" import productLive %}
<article data-product> … {{ productLive(product) }} </article>
```
