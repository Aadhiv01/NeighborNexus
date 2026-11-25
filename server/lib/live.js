/**
 * Live "something changed" signals for slot pickers, sent to browsers over Server-Sent Events.
 *
 * It only says THAT a provider's times changed, never what the booking was, so nothing private
 * travels over it and the endpoint can be public like the slots list itself. Clients react by
 * refetching the slots. Rooms live in this process's memory, which is right for one server. With
 * several, swap `publish` for something shared (Redis pub/sub, or MongoDB change streams).
 */
const rooms = new Map(); // providerId -> Set of open responses
const HEARTBEAT_MS = 25_000;

function subscribe(providerId, res) {
  if (!rooms.has(providerId)) rooms.set(providerId, new Set());
  rooms.get(providerId).add(res);
  res.on('close', () => {
    const set = rooms.get(providerId);
    set?.delete(res);
    if (set && set.size === 0) rooms.delete(providerId);
  });
}

function publish(providerId, data = {}) {
  const set = rooms.get(String(providerId));
  if (!set) return 0;
  const frame = `event: slots\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(frame);
  return set.size;
}

/** Opens an SSE response for one provider. */
function open(req, res, providerId) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // tell nginx not to buffer the stream
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n'); // browsers reconnect after 3 s if the connection drops
  subscribe(String(providerId), res);
  // A comment line every 25 s keeps proxies (nginx closes idle connections at 60 s) from cutting it.
  const beat = setInterval(() => res.write(': keep-alive\n\n'), HEARTBEAT_MS);
  beat.unref();
  res.on('close', () => clearInterval(beat));
}

/** Closes every open stream so a deploy or shutdown is not held up by them. */
function closeAll() {
  for (const set of rooms.values()) for (const res of set) res.end();
  rooms.clear();
}

const connections = () => [...rooms.values()].reduce((n, s) => n + s.size, 0);

module.exports = { open, publish, closeAll, connections };
