# Instagram

Cali's three latest Instagram posts, each linking to its post. `scripts/instagram.js` fetches them at build time with the Instagram API (`INSTAGRAM_ACCESS_TOKEN`), then downloads and resizes the images onto this site. There's no embed, third-party script or tracking. Without a token, or if Instagram can't be reached, the studio photos stand in as one decorative link to the profile.

```njk
{% from "patterns/instagram-band/instagram-band.njk" import instagramBand %}
{{ instagramBand({ id: "instagram", posts: instagram.posts, photos: shop.photos.studio }) }}
```

- **Used on:** Home, About
- **Token setup and refreshing:** see "Instagram" in the main README.

Docs: `/design-system/patterns/instagram-band/`
