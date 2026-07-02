# AdamCon 2026 — One-to-Ones App

> **Status: built.** This document is the design the app in this repo
> implements — see [`README.md`](./README.md) for running it and the
> pre-event checklist.

A minimal Swapcard-style networking app for [AdamCon 2026](https://adamjones.me/blog/adamcon-2026/)
(Sat 1 Aug 2026, 11:00–18:00, Granary Square / King's Cross, ~30 attendees).

**Scope: the one-to-ones feature only, ruthlessly simplified.** Profiles → directory
→ request a 25-minute meeting → accept/decline → personal schedule. All meetings
start at the water fountain.

## How the event works (constraints the app encodes)

- One day: 11:00–18:00 → 14 half-hour slots.
- Everyone breaks for lunch **12:30–13:30** (fixed, not configurable) → **12 bookable
  slots**: 3 in the morning, 9 in the afternoon.
- Meetings are 25 minutes on the 30-minute grid; the spare 5 minutes per slot is
  walking/buffer time.
- ~30 attendees, so at most ~15 concurrent meetings.
- One rendezvous spot: 💧 the water fountain on the canal towpath. Every meeting
  starts there — stated once at the top of the schedule, not per-meeting.

## The app: three tabs, four screens

UI theme matches adamjones.me: red-600 (`#e7000b`) accent, stone grays, plus a soft
red gradient wash behind each page header ("red wash", picked from side-by-side
colour treatments during design). No in-app header
bar (page titles sit in the content to save vertical space under Chrome's toolbar).
Bottom nav: **People · Schedule · Profile** (SVG icons, pill highlight on the active
tab, badge for requests needing an answer).

**Desktop** (people book ahead of time on laptops): **top nav** — the tab bar
becomes a website header (brand left, People/Schedule/Profile pills right), single
centred content column, red wash running the full window width. One media query,
no new components.

### 0. Sign in (logged-out state)
One field: the email you registered with → "Email me a sign-in link" → check-your-
inbox screen with an **open-my-inbox button** (provider inferred from the email
domain: Gmail/Outlook/Yahoo web links, generic `mailto:` otherwise), plus resend +
change-address escape hatches. Below the form: a link to
the registration form, noting new registrations take a while to be accepted.
No in-app signup — accounts exist only via the Airtable import.

### 1. Profile (always in edit mode)
The Profile tab *is* the edit form — no read-only view of yourself, no Edit button
to find. Fields (photo, name, headline, bio, link, WhatsApp number) arrive prefilled
from your registration; tweak and Save. To see your page as others see it, use your
own View entry in People. The WhatsApp number is never displayed but powers the
message button (clear it to opt out). **Sign out** top-right, always visible. No
availability here — the Schedule tab owns it. No separate settings page, and minimal
explanatory copy throughout.

### 2. People (directory)
Every attendee: photo, name, headline. Search covers names and full bio text.
People you haven't booked sort first. Status per card: Book button / grey
clock + time (request pending) / **green tick + time (booked, with the meeting
note shown)**. You appear in the list yourself, marked "you", with a **View**
button showing your page as others see it. No tags, no filters — with one exception:
arriving via "find someone" from a schedule slot applies a dismissible
"Free at HH:MM" filter.

### 3. Book (someone else's profile)
Same layout as your own page; below the bio sits a one-column slot list, tappable
only where **both** of you are free. Pick one, add an optional note, send. A
**WhatsApp button** (wa.me deep link) opens a chat with them directly — this is
why the app doesn't need chat.

### 4. Schedule (one timeline owns the whole day)
The single source of truth: booked meetings, **incoming requests at their slot with
Accept / Decline inline**, your own pending asks (with withdraw), lunch as two
30-minute rows, and free slots carrying **the availability toggle on the row**
("find someone" links to the time-filtered directory). Water-fountain reminder once
at the top; "now" line on the day. Tab badge counts requests needing an answer.

- **Blocking a booked slot is impossible by construction**: a booked row *is* the
  meeting and has no toggle. Cancel first, then flip the toggle.
- **Tap a meeting → bottom sheet**: time + spot, their note, WhatsApp button, and
  **Cancel meeting** (confirm → both parties notified → slot reopens).

## Booking rules

- A slot request **holds** that slot for both parties until answered or withdrawn —
  no auto-expiry; the requester can withdraw if someone is slow to respond.
- Accepting removes the slot from both people's availability everywhere.
- Either party can cancel a booking → both get notified, slot reopens.
- Max 1 pending outbound request per (requester, target) pair to prevent spamming.

## Onboarding: seed from Airtable

Signups already flow into the **AdamCon** Airtable base (`appNMfArZZ49tEtzH`),
table **2026 People** (`tblFgTD5bua4ZXvod`) — 10 signups as of 1 July. It has
Full name, Email, WhatsApp, LinkedIn/website, and a **Combined Bio** formula field
that is already a solid draft bio.

- An import script creates a User per Airtable row: name, email, link, bio.
- The onboarding email (with a magic link) replaces the old "Imported to swapcard" /
  "Sent swapcard onboarding email" checkbox workflow — the app writes status back
  so Airtable stays the source of truth for who's in.
- Re-running the import is idempotent (match on email) so late signups just work.
- Import-only accounts keep the app invite-gated: there is no public signup.

## The cut list (deliberately not building)

Tags · filters · chat (the WhatsApp deep link covers it) · a feed · a separate
requests inbox · a settings page · self-serve signup · multi-event support (a '27
problem — no `event_id` column) · realtime sync (60-second poll) · native apps ·
semantic search.

## Data model

```
User      { id, email, name, photo_url, headline, bio, link_url, whatsapp,
            airtable_record_id }
Slot      { id, starts_at }                     -- 12 fixed rows; lunch isn't one
Availability { user_id, slot_id, available }    -- default true; per-slot blocking
Meeting   { id, slot_id, requester_id, target_id, note,
            status: pending | accepted | declined | cancelled }
```

Invariants (enforced in one transaction on accept):
- ≤1 non-dead Meeting per (user, slot) across both requester/target roles.
- Both parties still available for the slot.

## Tech

Deliberately boring — it's 30 users for one day:

- **Next.js (App Router) + SQLite (better-sqlite3 or Prisma)**, deployed to the
  homelab k3s cluster (one block in `appDefinitions.ts`; ingress + TLS already
  handled). No realtime infra: the schedule polls every 60s.
- Magic-link auth (signed token via email). Sessions in a cookie.
- **Offline behaviour: service worker, not "install a PWA".** A service worker
  precaches the app shell on first visit, so the app loads instantly and survives
  flaky mobile signal on the towpath; live data still comes from the API and falls
  back to the last cached response. No install prompt — it works in a normal
  browser tab.
- **Email via Amazon SES** (AWS account already exists; homelab deploys use it).
  Setup ~2 weeks before the event, not the week of:
  1. Verify `adamjones.me` (or `mail.adamjones.me`) with DKIM DNS records.
  2. Request production access (new SES accounts are sandboxed to verified
     recipients only; approval takes a day or two).
  3. Default prod quota is 50k/day at 14/sec — total event volume is a few hundred
     emails, so limits are a non-issue. Cost: ~$0.10 per 1,000 emails.
  Fallback if SES approval drags: a Gmail/Workspace SMTP app-password sender is
  within its 500–2,000/day limit for this volume, but deliverability of magic-link
  emails is the whole login system, so SES + DKIM is the safe choice.
- **Email policy — only when the recipient must act or their day changed:**
  | Event | Email? | Why |
  |---|---|---|
  | Onboarding invite | yes | action: claim account, check profile |
  | Sign-in link | yes | transactional |
  | Incoming request | yes, one per request | action: answer it. Includes who, the time, and their note |
  | Request accepted | no | it appears on the requester's schedule — the app is the confirmation |
  | Request declined | no | nothing to do; slot reopens in-app — and nobody wants a rejection email |
  | Request withdrawn | no | nothing to do |
  | Booking cancelled | yes | your day changed; you may want to rebook the slot |
  | Event morning | one | your full schedule — doubles as the offline/outage fallback |

  Emails are simple table-based HTML in the site style (red-600 on white,
  single column, plain-text alternative), rendered from one template
  (`src/lib/emailTemplate.ts`). The meeting
  point links to the Google Maps pin from the blog post.

## Build order

1. Schema + seed (12 slots, import from Airtable) — ½ day
2. Magic-link auth (SES) + profile page with slot calendar — 1 day
3. Directory with name/bio search — ½ day
4. Request/accept/decline with the transaction rules — 1 day (the actual hard part)
5. Schedule view with inline requests + service-worker caching — ½ day
6. Notification emails + polish + deploy to homelab — 1 day

~4.5 days of work, comfortably done before 1 Aug. SES domain verification +
production access request should kick off in mid-July regardless.

The design was developed against per-screen HTML mockups and a self-contained
pitch page; those pre-build artifacts aren't kept in the repo.
