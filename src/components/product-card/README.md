# Product card

A framed image, title, summary (medium, size and year, or the print sizes), price, and badges. The title link covers the whole card.

```njk
{% from "components/product-card/product-card.njk" import productCard %}
{{ productCard(product, { headingLevel: 3, priority: loop.index <= 2 }) }}
```

Sold works show the Sold badge instead of a price, and the image fades a little.

Docs: `/design-system/components/product-card/`
