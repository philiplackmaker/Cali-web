# Split

Content beside a photo: content left and photo right on laptops (the photo stays in view while scrolling), photo first as a landscape strip on phones. With no photo, the content runs full width.

```njk
{% from "patterns/split/split.njk" import split %}
{% call split({ image: shop.photos.contact.image }) %}
  <h2>Send me a message</h2>
  {{ enquiryForm({ products: shop.products, align: "start" }) }}
{% endcall %}
```

- **Used on:** Commissions and contact (the form, beside the Commissions photo from Site photos).

Docs: `/design-system/patterns/split/`
