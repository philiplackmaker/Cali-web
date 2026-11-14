# Video clip

A short, silent, looping clip with its photo as the poster. `<video-clip>` plays it while it's on screen (and never for reduced motion), with a pause/play button for WCAG 2.2.2. Without JS the browser's controls show.

```njk
{% from "components/video-clip/video-clip.njk" import videoClip %}
{{ videoClip(photo.video, photo.image, { framed: true }) }}
```

- `clip`: `{ url, type, label }` from `scripts/content.js` (`clipFor`), which reads the admin's Clip fields and warns about files over 15 MB.
- Used by the artist intro, the studio strip (instagram-band fallback) and the product page (`product.clip`).
- Clips are served as uploaded from `/content/uploads/`; there's no transcoding. Ask for MP4 (H.264): it plays everywhere.
