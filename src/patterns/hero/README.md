# Hero

One painting, large, with the name and a line of introduction.

```njk
{% from "patterns/hero/hero.njk" import hero %}
{{ hero({ image: shop.photos.homeHero.image, eyebrow: "…", title: "Calico Melton", line: "…", primary: { href, label }, secondary: { href, label } }) }}
```

- **Used on:** Home
- The hero painting is the page’s LCP image. Also set `preloadImage` to it in the page’s data, so the browser fetches it before anything else. The photo is the `home hero` row in the sheet's Photos tab, or else the first painting.

Docs: `/design-system/patterns/hero/`
