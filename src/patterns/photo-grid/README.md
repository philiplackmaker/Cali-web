# Photo grid

Studio photos with captions.

```njk
{% from "patterns/photo-grid/photo-grid.njk" import photoGrid %}
{{ photoGrid({ id: "studio", heading: "The studio", photos: shop.photos.studio }) }}
```

- **Used on:** About
- The photos are the `studio` rows in the sheet's Photos tab, ordered by their Order column.

Docs: `/design-system/patterns/photo-grid/`
