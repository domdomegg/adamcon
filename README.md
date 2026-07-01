# adamcon

The AdamCon '26 one-to-ones app: profiles → directory → request a 25-minute
meeting → accept/decline → your day's schedule. All meetings start at the water
fountain. See `../PLAN.md` for the full design (data model, booking rules,
email policy, mockups).

Built from [typescript-webapp-template](https://github.com/domdomegg/typescript-webapp-template)
with API routes enabled (Next.js pages router + better-sqlite3).

## Local development

1. `npm install`
2. `npm run seed` — creates the mockup cast and prints a sign-in link per person
3. `npm start` — dev server (check the port it prints; sign-in links assume
   `APP_ORIGIN`, default `http://localhost:3000`)

In dev, emails aren't sent: they're logged to the console and appended to
`data/outbox.jsonl` (including magic links).

## Configuration (env vars)

| Var | What |
|---|---|
| `APP_ORIGIN` | Public origin used in emailed links, e.g. `https://adamcon.adamjones.me` |
| `EMAIL_FROM` | Set to enable real sending via Amazon SES (uses default AWS credential chain). Unset = dev outbox |
| `DATA_DIR` | Where `adamcon.db` + `outbox.jsonl` live (default `./data`) |
| `AIRTABLE_API_KEY` | PAT for the import script (data.records read/write on the AdamCon base) |

## Onboarding attendees

`npm run import` — idempotently imports the Airtable **2026 People** table
(match on email), emails each new person a magic-link invite, and ticks the
invited checkbox back in Airtable. Rerun any time for late signups.

## Before the event

- [ ] Verify the sending domain in SES (DKIM) + request production access (mid-July!)
- [ ] Point `REGISTRATION_URL` in `src/pages/login.tsx` at the real registration form
- [ ] Deploy: one block in homelab `appDefinitions.ts` (needs a persistent volume for `DATA_DIR`), set env vars above
- [ ] Morning-of schedule email (small script over `meetings`, or send manually)
