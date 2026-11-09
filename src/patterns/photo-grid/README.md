# Photo grid

Studio photos with captions.

```njk
{% from "patterns/photo-grid/photo-grid.njk" import photoGrid %}
{{ photoGrid({ id: "studio", heading: "The studio", photos: shop.photos.studio }) }}
```

- **Used on:** About
- The photos are the `studio` site photos in Shopify, ordered by their Order field.

Docs: `/design-system/patterns/photo-grid/`
