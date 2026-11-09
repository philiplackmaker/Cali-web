# Collection grid

The shop: filter links, then the paintings.

```njk
{% from "patterns/collection-grid/collection-grid.njk" import collectionGrid %}
{{ collectionGrid({ collections: shop.collections, current: collection }) }}
```

- **Used on:** /shop/, /shop/originals/, /shop/prints/
- The filter is ordinary links to real pages, so it works without JS and each view has its own URL and title. Has an empty state in Cali’s voice.

Docs: `/design-system/patterns/collection-grid/`
