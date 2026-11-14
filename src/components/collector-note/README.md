# Collector note

A quiet note about spreading the cost, driven by `site.payments` in `src/_data/site.js`. Both options are off by default, and the note renders nothing while both are off.

- `instalments`: only once they're switched on at Stripe Checkout (e.g. Klarna).
- `ownArt`: only if Cali is registered with Own Art. Confirm the terms and copy first.

```njk
{% from "components/collector-note/collector-note.njk" import collectorNote %}
{{ collectorNote(product) }}
```

Docs: `/design-system/components/collector-note/`
