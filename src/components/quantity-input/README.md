# Quantity `<quantity-input>`

For prints only (originals are always 1). Without JS it's a number input. JS adds − and + buttons, clamped to min and max, and fires `change` from the input.

```njk
{% from "components/quantity-input/quantity-input.njk" import quantityInput %}
{{ quantityInput({ id: "qty", max: 10 }) }}
```

The step buttons are out of the tab order. Keyboard users type or use the arrow keys.

Docs: `/design-system/components/quantity-input/`
