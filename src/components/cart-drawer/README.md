# Cart drawer `<cart-drawer>`

The basket in a native modal `<dialog>`. Included once in `_layouts/base.njk`. Anything with `data-cart-open` opens it, and without JS those are plain links to `/cart/`.

- **Lines** come from a `<template>`: image, title, variant, total, quantity (prints) or "One of a kind" (originals), and Remove.
- **Edits** go through the cart store. Quantity changes are debounced by 350ms.
- **Messages:** every change is announced in an `aria-live` region outside the dialog. Sold or short-stock lines and errors also show a notice.
- **Checkout** is a form: it posts the lines (id + quantity) and the delivery choice to `/api/checkout`, which sends the buyer to Stripe.
- `renderLines()` is exported for the full-page `/cart/` in step 3.

Docs: `/design-system/components/cart-drawer/`
