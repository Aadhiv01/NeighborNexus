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

  // ── live slot stream and concurrent booking ───────────────────────────
  {
    const when = await findOpenDate(provider._id, serviceId);
    const slots = (await api(`/api/bookings/slots?serviceProviderId=${provider._id}&serviceId=${serviceId}&date=${when.date}`)).data.slots;
    const pick = slots[slots.length - 1];
    const body = { serviceProviderId: provider._id, serviceId, date: when.date, startTime: pick.start, endTime: pick.end };
    const samTok = (await api('/api/auth', { method: 'POST', body: { email: 'sam@example.com', password: 'password123' } })).data.token;

    // Open the stream, then make a booking and expect a signal about it.
    const ctrl = new AbortController();
    const res = await fetch(`${BASE}/api/bookings/stream?serviceProviderId=${provider._id}`, { signal: ctrl.signal });
    check('the live stream opens as an event stream', res.status === 200 && (res.headers.get('content-type') || '').includes('text/event-stream'));
    let received = '';
    const reader = res.body.getReader();
    const pump = (async () => {
      const dec = new TextDecoder();
      try { for (;;) { const { done, value } = await reader.read(); if (done) break; received += dec.decode(value); } } catch { /* aborted */ }
    })();

    // Two members try for the very same time at the same instant: exactly one may win.
    const both = await Promise.all([
      api('/api/bookings', { method: 'POST', token: memberToken, body }),
      api('/api/bookings', { method: 'POST', token: samTok, body }),
    ]);
    const codes = both.map((r) => r.status).sort();
    check('two members booking the same time at once: one wins, one gets 409', codes[0] === 201 && codes[1] === 409, `got ${codes}`);
    check('the loser is told the time was just booked', both.some((r) => r.status === 409 && /booked|available/i.test(r.data?.msg || '')));

    await new Promise((r) => setTimeout(r, 400));
    check('the stream announced that times changed', received.includes('event: slots'));
    const winner = both.find((r) => r.status === 201);
    ctrl.abort();
    await pump;
    if (winner) await api(`/api/bookings/${winner.data._id}`, { method: 'DELETE', token: winner.data.user === login.data.user.id ? memberToken : samTok });
  }

  // ── public stats for the landing page ────────────────────────────────
  {
    const st = await api('/api/stats');
    check('public stats are available without signing in', st.status === 200 && typeof st.data.providers === 'number');
    check('stats count providers and group prices by category',
      st.data.providers === providers.data.length && st.data.categories.length > 0 &&
        st.data.categories.every((c) => c.minPrice <= c.avgPrice && c.avgPrice <= c.maxPrice));
    check('stats give the next 7 days of openings', st.data.openings.length === 7 && st.data.openings.every((o) => o.slots >= 0));
    check('stats carry nothing about individual people or bookings', !JSON.stringify(st.data).match(/email|userId|"user"|password/i));
  }

  // ── provider time off through the API ─────────────────────────────────
  {
    const provTok = (await api('/api/auth', { method: 'POST', body: { email: 'maya@example.com', password: 'password123' } })).data.token;
    const danielTok = (await api('/api/auth', { method: 'POST', body: { email: 'daniel@example.com', password: 'password123' } })).data.token;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const local = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const slotsOn = async (date) => (await api(`/api/bookings/slots?serviceProviderId=${provider._id}&serviceId=${serviceId}&date=${date}`)).data.slots;
    const days = [];
    for (let i = 3; i <= 20 && days.length < 2; i += 1) if ((await slotsOn(local(i))).length > 3) days.push(local(i));
    const [dayA, dayB] = days;
    const post = (body, token = provTok) => api('/api/serviceprovider/time-off', { method: 'POST', token, body });
    const made = [];

    check('time off needs a valid range and hours', [
      (await post({ startDate: local(-1) })).status,
      (await post({ startDate: dayB, endDate: dayA })).status,
      (await post({ startDate: dayA, endDate: local(25), startTime: '09:00', endTime: '10:00' })).status,
      (await post({ startDate: dayA, startTime: '09:00' })).status,
      (await post({ startDate: dayA, startTime: '10:00', endTime: '09:00' })).status,
      (await post({ startDate: 'not-a-date' })).status,
    ].every((c) => c === 400));
    check('only a provider can set time off', (await post({ startDate: dayA }, memberToken)).status === 403);
    check('a signed out visitor cannot set time off', (await api('/api/serviceprovider/time-off', { method: 'POST', body: { startDate: dayA } })).status === 401);

    const off = await post({ startDate: dayA, note: 'Private: holiday' });
    check('a provider can block a whole day', off.status === 201 && off.data.canceled === 0);
    const offId = off.data?.timeOff?._id;
    if (offId) made.push(offId);
    check('that day then has no open times', (await slotsOn(dayA)).length === 0);
    const listed = await api('/api/serviceprovider/time-off', { token: provTok });
    check('the provider sees their time off, with the private note', listed.data.some((t) => t._id === offId && t.note === 'Private: holiday'));
    check('another provider cannot remove it', (await api(`/api/serviceprovider/time-off/${offId}`, { method: 'DELETE', token: danielTok })).status === 404);
    check('a member cannot remove it', (await api(`/api/serviceprovider/time-off/${offId}`, { method: 'DELETE', token: memberToken })).status === 403);
    check('removing it brings the times back', (await api(`/api/serviceprovider/time-off/${offId}`, { method: 'DELETE', token: provTok })).status === 200 && (await slotsOn(dayA)).length > 3);
    made.pop();

    // Bookings already inside the time off: the provider must choose.
    const open = await slotsOn(dayB);
    const bookBody = { serviceProviderId: provider._id, serviceId, date: dayB, startTime: open[0].start, endTime: open[0].end };
    const mine = await api('/api/bookings', { method: 'POST', token: memberToken, body: bookBody });
    check('a member books a time that will later be blocked', mine.status === 201);
    const refused = await post({ startDate: dayB });
    check('blocking a day with a booking is refused until the provider chooses, and lists it',
      refused.status === 409 && refused.data.conflicts?.length === 1 && refused.data.conflicts[0].member);
    check('nothing was saved by the refused request', !(await api('/api/serviceprovider/time-off', { token: provTok })).data.some((t) => t.startDate === dayB));

    const kept = await post({ startDate: dayB, bookings: 'keep' });
    if (kept.data?.timeOff?._id) made.push(kept.data.timeOff._id);
    const stillThere = (await api('/api/bookings', { token: memberToken })).data.find((b) => b._id === mine.data._id);
    check('"keep" blocks the day but leaves the booking upcoming', kept.status === 201 && kept.data.kept === 1 && stillThere?.status === 'upcoming');
    await api(`/api/serviceprovider/time-off/${kept.data.timeOff._id}`, { method: 'DELETE', token: provTok });
    made.pop();

    const cancelled = await post({ startDate: dayB, bookings: 'cancel' });
    if (cancelled.data?.timeOff?._id) made.push(cancelled.data.timeOff._id);
    await wait(400);
    const after = (await api('/api/bookings', { token: memberToken })).data.find((b) => b._id === mine.data._id);
    check('"cancel" cancels the booking and records the provider as the one who did',
      cancelled.status === 201 && cancelled.data.canceled === 1 && after?.status === 'canceled' && after?.canceledBy === 'provider');
    const inbox = await api('/api/notifications', { token: memberToken });
    check('the member is told it was canceled', inbox.data.items.some((n) => n.type === 'booking_canceled' && n.booking === mine.data._id));
    check('the blocked day offers no times', (await slotsOn(dayB)).length === 0);

    for (const id of made) await api(`/api/serviceprovider/time-off/${id}`, { method: 'DELETE', token: provTok });
    check('removing the time off restores the day', (await slotsOn(dayB)).length > 3);
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
