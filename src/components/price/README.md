# Price

Formats Storefront `MoneyV2` with `Intl.NumberFormat` (en-GB). Whole pounds have no pence.

```njk
{% from "components/price/price.njk" import price %}
{{ price(variant) }}  {{ price(product, { size: "lg" }) }}
```

- **Shows:** a single price, "From £45" for price ranges, and sale prices ("£35, on sale, Was £45" to screen readers).
- **Logic:** `src/scripts/lib/money.js` (`describePrice`, `priceInnerHtml`). The browser uses it to update prices when a variant changes, so keep the markup here and in `priceInnerHtml` the same.

Docs: `/design-system/components/price/`
