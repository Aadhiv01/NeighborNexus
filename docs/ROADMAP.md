# NeighborNexus roadmap

What is done lives in the README and the git history. This file is what comes next, in rough order,
and why. Dates are deliberately absent.

## 1. Soon: finish the web product

- Landing page for signed-out visitors (try the options at `/lab/landing`, then pick one).
- "Request and confirm" mode: a provider can approve bookings before they count.
- Timezones. Times are stored as plain `HH:mm`, so reminders, "next free" and the reschedule cutoff
  assume the server and provider share a zone. Fix: store the provider's IANA zone, keep instants in
  UTC, format in the viewer's zone.
- Reviews members leave after a completed job (the model already has the shape).
- Deploy: API on a small container host, MongoDB Atlas, client on static hosting; set `SMTP_URL`.

## 2. Middle: works everywhere (browsers, screen sizes, orientation)

The layout is already responsive and has been checked at 390 px and 1280 px in Chromium. Make it a
guarantee instead of a hope:

- **Browser matrix in Playwright:** add Firefox and WebKit (Safari's engine) projects to
  `playwright.config.ts`, run the same suite on all three in CI.
- **Viewport matrix:** phone portrait and landscape (390x844, 844x390), tablet (820x1180), laptop,
  wide desktop. Assert no horizontal scroll and that nothing important sits under a notch or
  on-screen keyboard.
- **Known differences to handle:** View Transitions are not in every browser (already optional, the
  app works without them); `100vh` versus `dvh` on mobile Safari; native `<input type="date">` and
  `type="time"` look different per browser; `EventSource` and MapLibre need WebGL, so the map needs a
  fallback message where WebGL is off.
- **Touch and pointer:** tap targets at least 44 px, hover-only effects must not hide anything,
  focus styles visible on every control.
- **PWA:** web manifest, icons, installable, offline shell. About a day of work and gives most of the
  "feels like an app" benefit on phones.
- **Performance budget:** Lighthouse CI on the landing page and discovery (target 90+ for
  performance, accessibility and best practices on a mid-range phone profile).

## 3. Much later: a native mobile app (React Native)

Not before the web app is deployed and real people use it. Reasons to do it anyway: it is strong
evidence for senior full-stack roles, and the API is already shaped for it.

**Why the API is ready:** it uses bearer tokens, not cookies; every response is JSON; input is
validated with Zod; errors are `{ msg }`; the client types already exist in `client/src/lib/types.ts`.

**Plan**
1. Turn the repo into a workspace (`apps/web`, `apps/mobile`, `apps/api`, `packages/shared`) and move
   the types, the API client and the date/format helpers into `packages/shared`, so web and mobile use
   one copy.
2. Expo (managed workflow) with TypeScript and Expo Router. TanStack Query for data, as on the web.
3. Screens, in this order: sign in, discover (list), provider detail and booking, My bookings with
   reschedule and cancel, Updates. Then the provider side.
4. Native pieces that justify the work: push notifications for reminders and updates
   (`expo-notifications`, needs a push token endpoint and a sender on the server), token in secure
   storage (`expo-secure-store`), the device's location for "near me", a map (MapLibre native or
   `react-native-maps`), deep links from notifications to the booking.
5. Live slots: React Native has no built-in `EventSource`, so use a small SSE polyfill or fall back
   to refetch on focus.
6. Ship: EAS Build, TestFlight and Google Play internal testing; keep it to internal testing until it
   has been used for a while.

**What to avoid:** a WebView wrapper (no learning, weak result), and rebuilding the provider tools on
mobile first (members are the audience that benefits from an app).

## 4. Product ideas, not committed

- A provider reliability view built on the cancellation records already being kept (who canceled,
  how many hours before). Start private, show members something only once there is enough data and
  it is clearly fair.
- Provider "request a quote" for jobs with no fixed price.
- Photos on provider profiles, with moderation.
- Payments, only when there is something to charge for; late-cancel fees belong there.
