# Enquiry form

Commissions, viewings and questions about a painting.

```njk
{% from "patterns/enquiry-form/enquiry-form.njk" import enquiryForm %}
{{ enquiryForm({ products: shop.products }) }}
```

- **Used on:** /contact/
- Sent with Netlify Forms (form name `enquiry`, with a honeypot against spam) to `/contact/thanks/`. `?about=<handle>` or `?viewing=<handle>` fills in the topic and painting. JS checks the required fields with messages in Cali’s voice. Without JS, the browser does it.

Docs: `/design-system/patterns/enquiry-form/`
