# Prose

Long-form copy with a comfortable line length.

```njk
{% from "patterns/prose/prose.njk" import prose %}
{% call prose() %}<h2>…</h2><p>…</p>{% endcall %}
```

- **Used on:** About, Contact, Shipping and FAQ
- Plain HTML inside the call block. It’s the one place pages write their own markup, and the pattern styles it.

Docs: `/design-system/patterns/prose/`
