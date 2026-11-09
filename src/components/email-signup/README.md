# Email signup (The Studio Letter)

Posts to the existing Google Apps Script web app, which writes to the signups sheet. The endpoint is in `email-signup.njk`.

```njk
{% from "components/email-signup/email-signup.njk" import emailSignup %}
{{ emailSignup({ id: "footer-signup", compact: true, onBand: true }) }}
```

- **Without JS:** the form posts straight to the Apps Script.
- **With JS** (`email-signup.js`): it validates, posts with `no-cors` (the response is opaque, as on the old site), then shows "You're on the list." in a `role="status"` region.
- **onBand:** switches error text to maroon, because red on the pink band is only 4.19:1.

Docs: `/design-system/components/email-signup/`
