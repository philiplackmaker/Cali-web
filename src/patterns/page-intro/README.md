# Page intro

The eyebrow, h1 and short lede at the top of simple pages.

```njk
{% from "patterns/page-intro/page-intro.njk" import pageIntro %}
{{ pageIntro({ eyebrow: "The shop", title: "All work", lede: "…" }) }}
```

- **Used on:** Shop, About, Contact, Shipping and FAQ, 404
- One h1 per page. Keep the lede to one or two short sentences in Cali’s voice.

Docs: `/design-system/patterns/page-intro/`
