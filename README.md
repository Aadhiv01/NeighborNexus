# NeighborNexus

A community services marketplace. Members browse local service providers, see
real availability, and book a slot. Providers manage their services, weekly
availability, and incoming bookings.

Built with **Express + MongoDB** on the API and **React 18 + Vite + TanStack
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

**Requirements:** Node 18+, a MongoDB instance (local `mongod` or Atlas).

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

- **Vite 7** — dev server and build (Create React App is deprecated)
- **TanStack Query v5** — server state; query keys `["providers"]`,
  `["provider", userId]`, `["slots", providerId, serviceId, date]`,
  `["bookings"]`, `["providerBookings"]`, `["providerProfile"]`
- **React Router 6** — public discovery routes, role-gated dashboards via
  `<Outlet />`
- **PrimeReact** — tables, dialogs, inputs; page-level code splitting via
  `React.lazy`
- **Tailwind v4** — available for new UI; existing pages use the small style
  token module in `src/styles/ui.js`

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
| `GET` | `/` | public | Discover providers (`?category=&location=&q=`) |
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
| `POST` | `/` | bearer | Create a booking |
| `GET` | `/` | bearer | My bookings (member) or incoming (provider) |
| `GET` | `/:id` | owner/provider | One booking |
| `PUT` | `/:id` | owner/provider | Status transition |
| `DELETE` | `/:id` | owner/provider | Cancel |

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API with nodemon |
| `npm start` | API |
| `npm run seed` | Reset and seed demo data |
| `npm run smoke` | End-to-end API checks |
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
