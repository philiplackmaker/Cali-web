# Error banner

A page-level message when the shop’s catalogue can’t be loaded.

```njk
{% from "patterns/error-banner/error-banner.njk" import errorBanner %}
{{ errorBanner() }}   ← hidden until the cart store reports an error
{{ errorBanner({ message: "…" }) }}
```

- **Used on:** Product pages, /cart/
- `<error-banner>` listens to the cart store. It shows the store’s message on an error and hides again after the next successful change. It uses `role="alert"`, so it’s read out straight away.

Docs: `/design-system/patterns/error-banner/`
