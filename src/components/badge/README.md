# Badge

Original, Print, Edition of N, Sold.

```njk
{% from "components/badge/badge.njk" import badge, badges %}
{{ badge({ kind: "edition", edition: 50 }) }}
{{ badges(product | productBadges) }}
```

`productBadges` (in `src/scripts/lib/product.js`) works out the set from the `original` and `print` tags, the edition-size metafield and `availableForSale`.

Docs: `/design-system/components/badge/`
