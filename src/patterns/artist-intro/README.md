# Artist intro

A photo of Cali and a few lines in her voice.

```njk
{% from "patterns/artist-intro/artist-intro.njk" import artistIntro %}
{{ artistIntro({ id: "about-cali", image, heading: "Hello, I’m Cali", text: ["…", "…"], link: { href: "/about/", label: "More about me" } }) }}
```

- **Used on:** Home, About
- The photo is the `about-portrait` site photo in Shopify.

Docs: `/design-system/patterns/artist-intro/`
