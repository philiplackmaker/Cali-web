# Studio Letter band

The signup on the pink band, with an optional painting beside it.

```njk
{% from "patterns/signup-band/signup-band.njk" import signupBand %}
{{ signupBand({ id: "home-signup" }) }}
{{ signupBand({ id: "letter", feature: image, headingLevel: 1, priority: true }) }}
```

- **Used on:** Home, /studio-letter/ (feature variant, rebuilt from the old one-page site)
- Pages with this band set `footerSignup: false`, so the footer doesn’t ask a second time.

Docs: `/design-system/patterns/signup-band/`
