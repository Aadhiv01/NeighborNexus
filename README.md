# NeighborNexus

A community services marketplace. Members browse local service providers, see
real availability, and book a slot. Providers manage their services, weekly
availability, and incoming bookings.

Built with **Express + MongoDB** on the API and **React 19 + Vite 8 + TanStack
Query** on the client.

---

## Status

Phase 1 — **the member journey works end to end.** A member can browse
providers without an account, open a provider, pick a service and date, see
live availability, book, and manage or cancel the booking. Providers manage
services, weekly availability, incoming bookings, and their profile — all
against live data.

The API is covered by an end-to-end smoke test (21 checks), and the browser
flows for both roles were exercised against the running app.

---

## Quick start

**Requirements:** Node 22.18+ (the `.nvmrc` pins 24), a MongoDB instance (local `mongod` or Atlas).

```bash
# 1. Install
npm install
npm --prefix client install

# 2. Configure
cp .env.example .env          # then set JWT_SECRET
cp client/.env.example client/.env

# 3. Seed demo data
npm run seed

# 4. Run the API (http://localhost:4000) and the client (http://localhost:3001)
npm run dev
npm --prefix client run dev
```

The client calls `VITE_API_BASE_URL` (default `http://localhost:4000/api`).
If you change either port, add the client origin to `CORS_ORIGIN` in `.env`.

### Demo logins

Created by `npm run seed`. Password for all: `password123`

| Role | Email |
|---|---|
| Community Member | `alex@example.com` |
| Service Provider | `maya@example.com` |

### Verify it works

```bash
npm run smoke     # 21 end-to-end checks against a running API
```

```
ok   member can log in
ok   JWT carries only identity and role
ok   double-booking the same slot is rejected
ok   canceling returns the slot to availability
21 passed, 0 failed
```

---

## Architecture

```
┌────────────────────┐        ┌──────────────────────────┐        ┌──────────────┐
│  React client      │  HTTP  │  Express API             │        │  MongoDB     │
│  Vite + TS         │ ─────► │  /api/auth               │ ─────► │  users       │
│  TanStack Query v5 │        │  /api/serviceprovider    │        │  serviceprovider
│  UserContext       │        │  /api/bookings           │        │  bookings    │
│  ProtectedRoute    │        │                          │        │              │
└────────────────────┘        └──────────────────────────┘        └──────────────┘
```

### Client stack

- **Vite 8** (Rolldown) with the **React Compiler** enabled in `vite.config.ts`; TypeScript 7
- **TanStack Query v5** — server state; query keys `["providers"]`,
  `["provider", userId]`, `["slots", providerId, serviceId, date]`,
  `["bookings"]`, `["providerBookings"]`, `["providerProfile"]`
- **React Router 7** — public discovery routes, role-gated dashboards via
  `<Outlet />`
- **Base UI** for the hard accessibility pieces (dialogs and confirmations). Everything else
  is a small in-house kit in `src/ui` (buttons, fields, cards, toasts, donut chart), built on
  semantic HTML. PrimeReact, styled-components, Chart.js and react-icons are gone.
- **Tailwind v4** with design tokens in `src/theme/theme.css`: palette, type, mode and corners
  are data attributes on `<html>`. The default look is Paper palette, Schibsted Grotesk and
  Figtree, light mode, soft corners.
- **TypeScript strict** across the client. API calls and query keys live in `src/lib/api.ts`.
- **View Transitions**: provider cards morph into the detail page (`<Link viewTransition>`).
- **Theme lab** at `/lab` (temporary) — try palettes, type pairings, light/dark and
  corner styles live, with a contrast checker. Delete `src/pages/ThemeLab` and the `/lab`
  route when you no longer need it. `npm --prefix client run dev`, then
  open http://localhost:3001/lab

- **MapLibre** (loaded only when someone opens the Map view) with CARTO's light basemap. Pins are
  real buttons, so the map works with a keyboard, and the list always has the same information.

### Data model

- **User** — identity and role (`Community Member` | `Service Provider`).
  Password is `select: false`, so it is never returned unless explicitly asked for.
- **ServiceProvider** — one per provider user. Holds embedded `services`,
  a recurring weekly `availability` template, and `reviews`.
- **Booking** — a reservation of one provider's slot on one date.

### Design decisions worth knowing

**Availability is a template, not a ledger.**
`ServiceProvider.availability` describes a recurring week (e.g. Mondays
09:00–12:00). Bookings consume a specific *date*. Free slots are derived by
subtracting that day's bookings from the template — the template is never
mutated. The original code removed slots from `availability` on booking,
which permanently destroyed availability after one reservation.

**Double-booking is prevented by the database, not by a read-then-write check.**
A unique partial index on `(serviceProviderId, date, startTime)` where
`status: 'upcoming'` means two concurrent requests cannot both win. The loser
gets a duplicate-key error, which the error handler converts to `409`.
Application-level "is it free?" checks are still done for a friendly message,
but the index is the actual guarantee.

**Next available is computed on the server in one pass.** Discovery looks 14 days ahead for each
provider using a single bookings query for all of them, then drops anything earlier than now today.
It assumes the server and providers share a timezone, because times are stored as plain `HH:mm`.

**Nearby search uses MongoDB geo features.** `ServiceProvider.geo` is an optional GeoJSON point with a
`2dsphere` index, queried with `$geoNear` (which must be the first pipeline stage). Providers choose to
share a location, and the server rounds it to about 1 km before storing it, so an exact address is
never published. A visitor's own position is used for the query and never stored.

**Rescheduling is one guarded update.** A member moves their own upcoming booking; the new time is
checked against the provider's open slots with the booking's *own* current time treated as free (so
shifting by 30 minutes works), and the same unique index that stops double booking settles any race.
Where it used to be is kept in `reschedules`, so nothing is lost.

**Reminders go out once.** A reminder is due 24 hours before a booking that was made at least 24 hours
ahead, or 2 hours before one made the same day; a booking made less than 2 hours ahead gets none. A
reschedule restarts that clock. Each booking is claimed with one atomic update, so several server
instances can run the loop and only one will send (`check:reminders` proves this with concurrent
senders). Notifications are stored for the in-app Updates page and also emailed. Email uses SMTP when
`SMTP_URL` is set; without it messages are built and logged, never sent. Like "next available", timing
assumes the server and providers share a timezone.

**"Today" is the local calendar date.** Comparing against the UTC date told evening users in western
timezones that today had already passed; past times earlier today are also no longer offered.

**Cancelling frees the slot.** Because the index is partial, a booking that
moves to `canceled` or `completed` no longer occupies the slot.

**Bookings snapshot the service.** `serviceName` and `price` are copied onto
the booking at creation. Repricing or deleting a service later never rewrites
history.

**Booking dates are UTC midnights.** The server normalises `date` with
`startOfDayUTC`; the client renders dates in UTC so a booking never appears a
day earlier west of UTC.

**One auth source of truth.** The token lives in `localStorage`; the user lives
in `UserContext`. `ProtectedRoute` reads only from there. (The original app had
`AuthContext` *and* `UserContext` *and* Redux, with route guards commented out.)

**Authorisation before state validation.** In `PUT /api/bookings/:id`, a member
attempting to complete someone's booking gets `403` regardless of the booking's
current state — not a confusing `409`.

---

### Server layout

```
server/
  server.js            app setup, error handler, graceful shutdown
  lib/                 config (Zod-validated env), logger (Pino), validate, rate-limit
  middleware/auth.js   bearer token -> req.user
  modules/
    auth/              routes + Zod schemas
    providers/         routes, schemas, model
    bookings/          routes, schemas, model, slot maths
    users/             model
  scripts/             seed.js, smoke.js
```

Request bodies, queries and params are validated with Zod through one
`validate()` middleware. Express 5 forwards rejected promises to the central
error handler, so route handlers do not need `try/catch`. Read endpoints use
`.lean()`. Login and signup are rate limited.

## API

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/` | public | Log in → `{ token, user }` |
| `POST` | `/signup` | public | Register → `{ token, user }` |
| `GET` | `/verify-token` | bearer | Validate a stored token |

### Providers — `/api/serviceprovider`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/` | public | Discover providers (`?category=&location=&q=&lat=&lng=&radiusKm=`). Each result has `nextAvailable`; with `lat` and `lng` results are nearest first with `distanceMeters` |
| `GET` | `/services` | provider | List own services |
| `POST` | `/services` | provider | Add a service |
| `PUT` | `/services/:serviceId` | provider | Edit a service |
| `DELETE` | `/services/:serviceId` | provider | Delete a service |
| `GET` | `/availability` | provider | Read weekly template |
| `POST` | `/availability` | provider | Replace a day's slots |
| `GET` | `/bookings` | provider | Incoming bookings |
| `PUT` | `/bookings/:bookingId` | provider | Update booking status |
| `GET` | `/profile` | provider | Own profile |
| `GET` | `/profile/:userId` | public | Public profile |
| `PUT` | `/profile/:userId` | self | Update profile (whitelisted fields) |

### Bookings — `/api/bookings`

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/slots` | public | Free slots (`?serviceProviderId=&serviceId=&date=`) |
| `POST` | `/` | member | Create a booking (providers get 403) |
| `GET` | `/` | bearer | My bookings (member) or incoming (provider) |
| `GET` | `/:id` | owner/provider | One booking |
| `PUT` | `/:id` | owner/provider | Status transition |
| `POST` | `/:id/reschedule` | owner (member) | Move an upcoming booking to another open time |
| `DELETE` | `/:id` | owner/provider | Cancel |

---

### Notifications: `/api/notifications` (bearer)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | My latest 50, plus `unread` count |
| `PUT` | `/read-all` | Mark everything read |
| `PUT` | `/:id/read` | Mark one read (only your own) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API with `node --watch` |
| `npm start` | API |
| `npm run seed` | Reset and seed demo data |
| `npm run smoke` | End-to-end API checks against a running API |
| `npm test` | Unit tests (reminder timing, today and past slots) |
| `npm run test:e2e` | End-to-end tests in a real browser with axe accessibility checks. They start their own API (4100), client (3002) and `nn_e2e` database. Run `npx playwright install chromium` once first |
| `npm run check:reminders` | Reminder sending against a real database, including races |
| `npm run reminders` | Send due reminders once and exit (for cron, when the web process runs with `REMINDERS=off`) |
| `npm --prefix client run dev` | Client dev server (port 3001) |
| `npm --prefix client run build` | Production build to `client/dist` |
| `npm --prefix client run preview` | Serve the production build |
| `npm --prefix client run typecheck` | `tsc --noEmit` |

---

## Roadmap

**Phase 1 — member journey** ✅
- Provider search and filtering (`/services`)
- Provider detail + booking flow (`/services/:providerId`)
- Member bookings list with cancel (`/bookings`)
- Provider dashboard, bookings table, services CRUD, availability editor and
  profile editor — all on live data

**Phase 2 — AI layer**
- Semantic provider search (embeddings + Atlas Vector Search)
- Booking assistant with tool calling and a confirmation step
- Review summarisation
- Evals in CI, LLM call tracing with cost and latency, prompt-injection
  defences (reviews are untrusted user input)

**Hardening**
- Integration tests around the booking race (concurrent `POST /bookings`)
- Rate limiting on auth endpoints
