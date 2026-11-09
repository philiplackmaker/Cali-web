# Variant picker `<variant-picker>`

Radio groups for each option (Size, Paper). Must sit inside the `<add-to-cart>` form, inside an element with `data-product` that holds the price.

```njk
{% from "components/variant-picker/variant-picker.njk" import variantPicker %}
{{ variantPicker(product, { selected: variant }) }}
```

When the choice changes, it:

- sets the form's hidden `id` input
- updates `[data-price]` in the same `data-product` element
- marks sold-out values (struck through, plus hidden "(sold out)" text)
- sets `?variant=` with `replaceState`
- fires a bubbling `variant:change` event with `{ variant }`

The server side uses the `optionStates` filter, and the browser uses `findVariant`. Both are in `src/scripts/lib/product.js` and unit-tested.

Docs: `/design-system/components/variant-picker/`
