# Link

Styled links for going somewhere. Plain `<a>` tags in copy get the same look from `base.css`.

```njk
{% from "components/link/link.njk" import link %}
{{ link({ href: "/shop/prints/", label: "See all prints", variant: "arrow" }) }}
```

- **Variants:** `default`, `quiet`, `arrow`, `back`. `external: true` opens a new tab and tells screen readers.
- **Accessibility:** always underlined in text, `aria-current` with `current: true`.

Docs: `/design-system/components/link/`
