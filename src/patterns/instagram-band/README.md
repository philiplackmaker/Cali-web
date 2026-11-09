# Instagram

Studio photos that link out to @calicomelton.

```njk
{% from "patterns/instagram-band/instagram-band.njk" import instagramBand %}
{{ instagramBand({ id: "instagram", photos: shop.photos.studio }) }}
```

- **Used on:** Home, About (without photos)
- It links out instead of embedding a feed: no third-party script, tracking or slowdown. The photos are one big decorative link, hidden from screen readers. The text link “Follow @calicomelton” is the real one.

Docs: `/design-system/patterns/instagram-band/`
