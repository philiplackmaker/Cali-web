# Empty basket

What the basket says when there’s nothing in it.

```njk
{% from "patterns/empty-cart/empty-cart.njk" import emptyCart %}
{{ emptyCart() }}
```

- **Used on:** The cart drawer (passed in by the base layout) and /cart/

Docs: `/design-system/patterns/empty-cart/`
