# From the studio (Instagram band)

Cali's studio photos (from the admin's Site photos, with captions, or a short clip), then her three latest Instagram posts, each linking to its post. `scripts/instagram.js` fetches the posts at build time with the Instagram API (`INSTAGRAM_ACCESS_TOKEN`), then downloads and resizes the images onto this site. There's no embed, third-party script or tracking. Without a token, or if Instagram can't be reached, it shows just the studio photos.

```njk
{% from "patterns/instagram-band/instagram-band.njk" import instagramBand %}
{{ instagramBand({ id: "instagram", posts: instagram.posts, photos: shop.photos.studio }) }}
```

- **Used on:** Home, About
- **Token setup and refreshing:** see "Instagram" in the main README.

Docs: `/design-system/patterns/instagram-band/`
