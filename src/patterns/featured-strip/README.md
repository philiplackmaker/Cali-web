# Featured work

A heading, a few paintings, and a link to see the rest.

```njk
{% from "patterns/featured-strip/featured-strip.njk" import featuredStrip %}
{{ featuredStrip({ id: "new-work", title: "New work", products: shop.latest, link: { href: "/shop/", label: "See all work" } }) }}
```

- **Used on:** Home (latest 6), product pages (“More from the studio”), 404
- Also defines `.ds-card-grid`, the shared grid for product cards. It’s never more than three across, so paintings stay large.

Docs: `/design-system/patterns/featured-strip/`
