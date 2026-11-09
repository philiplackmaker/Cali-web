# Header and nav

The logo, main nav and basket link. On narrow screens the nav is a `<details>` menu, so it works without JS. `cart-count.js` defines `<cart-count>`, which shows the basket count and names the link "Basket, 2 items".

```njk
{% from "components/header/header.njk" import siteHeader %}
{{ siteHeader({ currentUrl: page.url }) }}
```

Edit the links in `NAV` at the top of `header.njk`.

Docs: `/design-system/components/header/`
