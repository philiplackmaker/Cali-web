# Icon

An inline SVG sprite (`sprite.njk`, included once by the base layout) plus an `icon()` macro.

```njk
{% from "components/icon/icon.njk" import icon %}
{{ icon("bag") }}  {{ icon("close", { size: "md", label: "Close" }) }}
```

- **Add an icon:** add a `<symbol id="ds-icon-NAME" viewBox="0 0 24 24">` to `sprite.njk`. Draw it on a 24px grid with a 1.5 stroke, `currentColor` and round caps.
- **Accessibility:** `aria-hidden` unless you pass `label`.

Docs: `/design-system/components/icon/`
