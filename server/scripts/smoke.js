/**
 * End-to-end smoke test against a running API.
 *
 *   npm run smoke
 *
 * Exercises the flows that were broken in Phase 0: auth, discovery,
 * availability derivation, booking, the double-booking guard, and cancel.
 */
const BASE = process.env.API_URL || 'http://localhost:4000';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/** Find the next date (within 14 days) that has free slots. */
async function findOpenDate(providerId, serviceId) {
  for (let i = 1; i <= 14; i += 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    // eslint-disable-next-line no-await-in-loop
    const { data } = await api(
      `/api/bookings/slots?serviceProviderId=${providerId}&serviceId=${serviceId}&date=${iso}`
    );
    if (data?.slots?.length) return { date: iso, slot: data.slots[0] };
  }
  return null;
}

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  // ── health ────────────────────────────────────────────────────────────
  const health = await api('/health');
  check('health endpoint returns ok', health.status === 200 && health.data.status === 'ok');

  // ── auth ──────────────────────────────────────────────────────────────
  const login = await api('/api/auth', {
    method: 'POST',
    body: { email: 'alex@example.com', password: 'password123' },
  });
  check('member can log in', login.status === 200 && !!login.data.token);
  check('login does not leak the password hash', login.data.user.password === undefined);

  const jwtPayload = JSON.parse(
    Buffer.from(login.data.token.split('.')[1], 'base64').toString()
  );
  check(
    'JWT carries only identity and role',
    Object.keys(jwtPayload.user).sort().join(',') === 'id,type',
    JSON.stringify(jwtPayload.user)
  );

  const memberToken = login.data.token;

  const badLogin = await api('/api/auth', {
    method: 'POST',
    body: { email: 'alex@example.com', password: 'wrong' },
  });
  check('wrong password is rejected', badLogin.status === 400);

  const verify = await api('/api/auth/verify-token', { token: memberToken });
  check('token verification works', verify.status === 200 && verify.data.user.email === 'alex@example.com');

  const noToken = await api('/api/serviceprovider/services');
  check('protected route rejects anonymous requests', noToken.status === 401);

  // ── discovery ─────────────────────────────────────────────────────────
  const providers = await api('/api/serviceprovider');
  check('provider discovery returns results', providers.status === 200 && providers.data.length > 0);

  const provider = providers.data.find((p) => p.services.length > 0);
  check('providers expose their services', !!provider);

  const filtered = await api('/api/serviceprovider?category=Plumbing');
  check(
    'discovery filters by category',
    filtered.status === 200 && filtered.data.every((p) => p.services.some((s) => s.category === 'Plumbing'))
  );

  // ── availability ──────────────────────────────────────────────────────
  const serviceId = provider.services[0]._id || provider.services[0].id;
  const open = await findOpenDate(provider._id, serviceId);
  check('availability is derived from the weekly template', !!open);

  if (open) {
    const { date, slot } = open;

    // ── booking ─────────────────────────────────────────────────────────
    const created = await api('/api/bookings', {
      method: 'POST',
      token: memberToken,
      body: {
        serviceProviderId: provider._id,
        serviceId,
        date,
        startTime: slot.start,
        endTime: slot.end,
      },
    });
    check('member can book an open slot', created.status === 201, JSON.stringify(created.data));
    const bookingId = created.data?._id;

    // ── double-booking guard ────────────────────────────────────────────
    const duplicate = await api('/api/bookings', {
      method: 'POST',
      token: memberToken,
      body: {
        serviceProviderId: provider._id,
        serviceId,
        date,
        startTime: slot.start,
        endTime: slot.end,
      },
    });
    check('double-booking the same slot is rejected', duplicate.status === 409, `got ${duplicate.status}`);

    // ── slot disappears from availability ───────────────────────────────
    const after = await api(
      `/api/bookings/slots?serviceProviderId=${provider._id}&serviceId=${serviceId}&date=${date}`
    );
    check(
      'booked slot is no longer offered',
      !after.data.slots.some((s) => s.start === slot.start && s.end === slot.end)
    );

    // ── member's booking list ───────────────────────────────────────────
    const mine = await api('/api/bookings', { token: memberToken });
    check(
      'member sees their booking',
      mine.status === 200 && mine.data.some((b) => b._id === bookingId)
    );

    // ── provider sees it too ────────────────────────────────────────────
    const providerLogin = await api('/api/auth', {
      method: 'POST',
      body: { email: 'maya@example.com', password: 'password123' },
    });
    const providerToken = providerLogin.data.token;
    const providerBooking = await api('/api/bookings', {
      method: 'POST',
      token: providerToken,
      body: { serviceProviderId: provider._id, serviceId, date, startTime: slot.start, endTime: slot.end },
    });
    check('providers cannot book services', providerBooking.status === 403);
    const incoming = await api('/api/serviceprovider/bookings', { token: providerToken });
    check(
      'provider sees incoming bookings',
      incoming.status === 200 && incoming.data.some((b) => b._id === bookingId)
    );

    // ── cancel frees the slot ───────────────────────────────────────────
    const canceled = await api(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      token: memberToken,
    });
    check('member can cancel a booking', canceled.status === 200 && canceled.data.booking.status === 'canceled');

    const reopened = await api(
      `/api/bookings/slots?serviceProviderId=${provider._id}&serviceId=${serviceId}&date=${date}`
    );
    check(
      'canceling returns the slot to availability',
      reopened.data.slots.some((s) => s.start === slot.start && s.end === slot.end)
    );

    // ── members cannot complete bookings ────────────────────────────────
    const forbidden = await api(`/api/bookings/${bookingId}`, {
      method: 'PUT',
      token: memberToken,
      body: { status: 'completed' },
    });
    check('members cannot mark bookings completed', forbidden.status === 403, `got ${forbidden.status}`);
  }

  // ── validation ────────────────────────────────────────────────────────
  const badBooking = await api('/api/bookings', {
    method: 'POST',
    token: memberToken,
    body: { serviceProviderId: provider._id },
  });
  check('invalid booking payload is rejected', badBooking.status === 400);

  const badProfile = await api('/api/serviceprovider/profile/000000000000000000000000', {
    method: 'PUT',
    token: memberToken,
  });
  check('member cannot edit another profile', badProfile.status === 403);

  // ── reschedule and notifications ──────────────────────────────────────
  {
    const when = await findOpenDate(provider._id, serviceId);
    const day = when.date;
    const list = async (exclude = '') =>
      (await api(`/api/bookings/slots?serviceProviderId=${provider._id}&serviceId=${serviceId}&date=${day}${exclude ? `&excludeBookingId=${exclude}` : ''}`)).data.slots;
    const slots = await list();
    const [s0, s1] = slots;
    const last = slots[slots.length - 1];
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const reschedule = (id, body, token = memberToken) =>
      api(`/api/bookings/${id}/reschedule`, { method: 'POST', token, body });

    const mine = await api('/api/bookings', {
      method: 'POST', token: memberToken,
      body: { serviceProviderId: provider._id, serviceId, date: day, startTime: s0.start, endTime: s0.end },
    });
    check('member can book the slot to be moved', mine.status === 201);
    const id = mine.data?._id;

    check('slots without exclude hide the booking\'s own time', !(await list()).some((x) => x.start === s0.start));
    check('slots with exclude show the booking\'s own time as free', (await list(id)).some((x) => x.start === s0.start));

    const moved = await reschedule(id, { date: day, startTime: s1.start, endTime: s1.end });
    check(
      'member can move a booking, even by overlapping their own time',
      moved.status === 200 && moved.data.startTime === s1.start && moved.data.reschedules?.length === 1 &&
        moved.data.reschedules[0].startTime === s0.start
    );

    const afterMove = (await list()).map((x) => x.start);
    check('the old time is free again after moving', !afterMove.includes(s1.start) && afterMove.includes(s0.start) === (s0.end <= s1.start));
    check('moving to the same time is rejected', (await reschedule(id, { date: day, startTime: s1.start, endTime: s1.end })).status === 400);

    const provTok = (await api('/api/auth', { method: 'POST', body: { email: 'maya@example.com', password: 'password123' } })).data.token;
    check('a provider cannot reschedule a member\'s booking', (await reschedule(id, { date: day, startTime: s0.start, endTime: s0.end }, provTok)).status === 403);

    const samTok = (await api('/api/auth', { method: 'POST', body: { email: 'sam@example.com', password: 'password123' } })).data.token;
    check('another member cannot move this booking', (await reschedule(id, { date: day, startTime: s0.start, endTime: s0.end }, samTok)).status === 403);

    const sams = await api('/api/bookings', {
      method: 'POST', token: samTok,
      body: { serviceProviderId: provider._id, serviceId, date: day, startTime: last.start, endTime: last.end },
    });
    check('a second member books a different time', sams.status === 201);
    check('moving onto a taken time is rejected', (await reschedule(id, { date: day, startTime: last.start, endTime: last.end })).status === 409);

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    check('moving to a past date is rejected', (await reschedule(id, { date: localDay(yesterday), startTime: s0.start, endTime: s0.end })).status === 400);
    check('moving to a different length is rejected', (await reschedule(id, { date: day, startTime: s0.start, endTime: '23:59' })).status === 400);

    await wait(400); // notifications are sent after the response
    const inbox = await api('/api/notifications', { token: provTok });
    const types = (inbox.data.items || []).map((n) => n.type);
    check('the provider is notified of the new booking and the move', types.includes('booking_created') && types.includes('booking_rescheduled'));
    check('the inbox reports an unread count', inbox.data.unread >= 2);

    const target = inbox.data.items[0];
    check('a member cannot mark a provider\'s notification read', (await api(`/api/notifications/${target._id}/read`, { method: 'PUT', token: memberToken })).status === 404);
    const read = await api(`/api/notifications/${target._id}/read`, { method: 'PUT', token: provTok });
    check('the owner can mark a notification read', read.status === 200 && !!read.data.readAt);
    await api('/api/notifications/read-all', { method: 'PUT', token: provTok });
    check('read-all clears the unread count', (await api('/api/notifications', { token: provTok })).data.unread === 0);

    const canceled = await api(`/api/bookings/${id}`, { method: 'DELETE', token: provTok });
    await wait(300);
    const memberInbox = await api('/api/notifications', { token: memberToken });
    check('a provider canceling notifies the member', canceled.status === 200 && memberInbox.data.items.some((n) => n.type === 'booking_canceled'));
    await api(`/api/bookings/${sams.data._id}`, { method: 'DELETE', token: samTok });
  }

  // ── next available and near me ────────────────────────────────────────
  const withNext = providers.data.filter((p) => p.nextAvailable);
  check(
    'discovery includes each provider\'s next open slot',
    withNext.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(withNext[0].nextAvailable.date) && !!withNext[0].nextAvailable.start
  );
  check('discovery does not expose the full availability template', providers.data.every((p) => p.availability === undefined));

  const near = await api('/api/serviceprovider?lat=43.6532&lng=-79.3832');
  const dists = (near.data || []).map((p) => p.distanceMeters);
  check(
    'near me returns providers nearest first with distances',
    near.status === 200 && dists.length > 1 && dists.every((d, i) => i === 0 || d >= dists[i - 1])
  );
  const radius = await api('/api/serviceprovider?lat=43.6532&lng=-79.3832&radiusKm=10');
  check(
    'radius filter drops providers that are too far',
    radius.status === 200 && radius.data.length > 0 && radius.data.length < near.data.length &&
      radius.data.every((p) => p.distanceMeters <= 10000)
  );
  const badGeo = await api('/api/serviceprovider?lat=43.6');
  check('lat without lng is rejected', badGeo.status === 400);

  // Stored coordinates are rounded so an exact address is never published.
  const prov = await api('/api/auth', { method: 'POST', body: { email: 'maya@example.com', password: 'password123' } });
  const mine = await api('/api/serviceprovider/profile', { token: prov.data.token });
  const saved = await api(`/api/serviceprovider/profile/${mine.data.userId}`, {
    method: 'PUT',
    token: prov.data.token,
    body: { geo: { lat: 43.653226, lng: -79.383184 } },
  });
  check(
    'saved location is rounded to about 1 km',
    saved.status === 200 && saved.data.geo?.coordinates?.[0] === -79.38 && saved.data.geo?.coordinates?.[1] === 43.65
  );
  const cleared = await api(`/api/serviceprovider/profile/${mine.data.userId}`, {
    method: 'PUT', token: prov.data.token, body: { geo: null },
  });
  check('location can be cleared', cleared.status === 200 && cleared.data.geo === undefined);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nSmoke test crashed:', err);
  process.exit(1);
});
