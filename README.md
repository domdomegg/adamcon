# adamcon

**Live at https://adamcon.home.adamjones.me** (homelab k3s; image
`ghcr.io/domdomegg/adamcon` built by CI on every push to master — restart the
`adamcon` service via the homelab restart workflow to pick up a new image).

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
| `EMAIL_FROM` | Set to enable real sending via Amazon SES (default credential chain — in-cluster this is workload identity federation, see `infra/README.md`). Unset = dev outbox |
| `DATA_DIR` | Where `adamcon.db` + `outbox.jsonl` live (default `./data`) |
| `AIRTABLE_API_KEY` | PAT for the import script (data.records read/write on the AdamCon base) |

## Onboarding attendees

`npm run import` — idempotently imports the Airtable **2026 People** table
(match on email), emails each new person a magic-link invite, and ticks the
invited checkbox back in Airtable. Rerun any time for late signups.

## Before the event

- [ ] Morning-of schedule email (small script over `meetings`, or send manually)
