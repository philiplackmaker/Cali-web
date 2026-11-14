# Add to cart `<add-to-cart>`

The product form. On submit it calls the cart store (`src/scripts/cart.js`), then opens the drawer.

```njk
{% from "components/add-to-cart/add-to-cart.njk" import addToCart %}
{% call addToCart(product) %}{{ variantPicker(product) }}{{ quantityInput({ id: "qty" }) }}{% endcall %}
```

**States:**

- Add to basket
- Adding… (loading)
- Sold out (print variant)
- In your basket (originals, with a link to view)
- Sold original ("This painting has sold." and "Enquire about similar work")
- Shop unreachable (error message, button stays usable to retry)

Docs: `/design-system/components/add-to-cart/`
