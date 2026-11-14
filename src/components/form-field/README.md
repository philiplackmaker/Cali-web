# Form field

A label, an optional hint, an input or textarea, and an error slot, wired up with `aria-describedby` and `aria-invalid`.

```njk
{% from "components/form-field/form-field.njk" import formField %}
{{ formField({ id: "email", label: "Email address", type: "email", autocomplete: "email", error: "…" }) }}
```

**Copy:** say what to do, e.g. "Enter your email address to sign up."

Docs: `/design-system/components/form-field/`
