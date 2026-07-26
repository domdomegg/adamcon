# Invite email

The onboarding email sent to each attendee once the app is live. Sent manually
from Gmail (plain text, no HTML part) rather than through the app — `npm run
import` sends its own shorter version from `scripts/import-airtable.ts`, so if
you change one, consider whether the other should match.

The sign-in link is the `?email=` prefill form, not a magic-link token: it lands
on the login page with the address filled in, and the recipient requests their
own link from there. That keeps the invite safe to forward or re-send, and means
it never expires.

Substitute the recipient's first name and URL-encoded email address.

**Subject**

```
AdamCon 2026: complete your profile and book meetings now
```

**Body**

```
Hi {first name},

The AdamCon app is now live! Looking forward to seeing you on Sat 1 Aug around Kings Cross. Ahead of then you should:

1. Sign in at: https://adamcon.home.adamjones.me/?email={url-encoded email}
2. Upload a profile picture
3. Book some 25-minute one-to-one conversations.

If anything doesn't work or if you have any questions, let me know.

Best,
Adam
```

## Onboarding someone late

For anyone who registers after the bulk send (see "Onboarding attendees" in the
README), create their account, then send them this same email so their
experience matches everyone else's.
