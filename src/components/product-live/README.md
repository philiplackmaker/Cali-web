# Product live `<product-live>`

Checks a product's price and stock against the catalogue (`/assets/data/catalog.json`) when its page opens, via `client.availability(handle)` in `src/scripts/local-cart.js`. With the catalogue coming from the same build, this mostly matters for the docs' sold and offline demos; the checkout function makes the final check.

- **Prints:** gives fresh variants to `<variant-picker>`, which re-marks sold-out options and updates the price.
- **Originals:** updates the price. If the painting has sold, it swaps `[data-buy]` for the `<template data-sold-template>` (the sold notice).
- **Catalogue unreachable:** fires `product:offline`, and `<add-to-cart>` disables with a short message. The static page still reads fine.

```njk
{% from "components/product-live/product-live.njk" import productLive %}
<article data-product> … {{ productLive(product) }} </article>
```
