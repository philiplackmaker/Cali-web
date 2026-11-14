# Header and nav

The logo, main nav and basket link. On narrow screens the nav is a `<details>` menu, so it works without JS. `cart-count.js` defines `<cart-count>`, which shows the basket count and names the link "Basket, 2 items".

```njk
{% from "components/header/header.njk" import siteHeader %}
{{ siteHeader({ currentUrl: page.url }) }}
```

Edit the links in `NAV` at the top of `header.njk`.

Docs: `/design-system/components/header/`

## Light/dark switch

`<theme-toggle>` (`theme-toggle.js`) sits between the nav and the basket. It's a button with `aria-pressed` (pressed = dark), showing a moon in light mode and a sun in dark mode.

- Until it's pressed, the site follows the device setting (`prefers-color-scheme`).
- Pressing it sets `<html data-theme="light|dark">` and saves the choice in `localStorage` (`ds-theme`). An inline script in `base.njk` applies a saved choice before anything paints, so there's no flash. Choosing the same mode as the device clears the saved choice.
- Hidden without JavaScript; the device setting still applies.
- The colours are tokens: `tokens/themes/dark.json` → `tokens-dark.css`. See the Colour section on the Tokens page.
- On phones (under 26.25rem) the Menu and Basket labels are visually hidden to make room.
