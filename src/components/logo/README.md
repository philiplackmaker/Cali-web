# Logo

The flower mark (SVG, traced from `flower-mark.png`) and the name.

```njk
{% from "components/logo/logo.njk" import logo, flowerMark %}
{{ logo({ href: "/" }) }}  {{ flowerMark({ class: "my-class" }) }}
```

- **Tokens:** `--ds-color-brand-mark`, `--ds-color-brand-mark-centre`, `--ds-icon-logo`.
- **To do:** replace the trace with Cali's source vector if there is one.

Docs: `/design-system/components/icon/#logo`
