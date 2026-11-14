# Button

For actions. Renders a `<button>`, or an `<a>` when given `href`.

```njk
{% from "components/button/button.njk" import button %}
{{ button({ label: "Add to basket", type: "submit", full: true }) }}
```

- **Variants:** `primary` (default), `secondary`, `quiet`.
- **States:** `disabled`, and `loading` (spinner, `aria-busy`, stays focusable).
- **Tokens:** `--ds-button-*`, `--ds-color-action-*`.
- **Accessibility:** 44px minimum target, focus ring from tokens, no motion with reduced motion.

Docs: `/design-system/components/button/`
