# Section

The page rhythm: every pattern on a page sits in a section.

```njk
{% from "patterns/section/section.njk" import section %}
{% call section({ variant: "band", labelledby: "new-work" }) %}…{% endcall %}
```

- **Used on:** Every page
- Sections give consistent space above and below, and keep content to the page width with side gutters. Two plain sections in a row share their gap.

Docs: `/design-system/patterns/section/`
