import api from "./client";

const BASE = "/reservations";

// ─────────────────────────────────────────────────────────────────
// SERVER CLOCK SYNC
//
// The device clock can never be trusted — a user can set it to
// anything. We fetch the server's real time once (GET /meta already
// returns `serverTime`), compute the drift between that and this
// device's Date.now(), and cache it. From then on getServerNow()
// returns device-clock + drift, which tracks the server's real time
// even if the device clock is wrong — because we're only using the
// device clock to measure elapsed ms (its *rate*), not as a source
// of "what time is it right now".
//
// We also resync periodically: if the device clock jumps (NTP
// correction, user changes it mid-session, laptop wakes from sleep,
// etc.) the cached drift would otherwise go stale.
// ─────────────────────────────────────────────────────────────────

let serverTimeAtSyncMs = 0;
let localPerfAtSyncMs = 0;
let lastSyncedAt = 0;
let inFlightSync = null;

const SYNC_STALE_AFTER_MS = 60_000;

const nowPerf = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now());

/**
 * Hits the server, measures round-trip time, and updates the cached
 * server-time anchor. Uses `performance.now()` if available so the
 * client keeps correct server time even when the user changes their
 * device clock mid-session.
 */
export const syncServerTime = async () => {
  if (inFlightSync) return inFlightSync;

  inFlightSync = (async () => {
    const requestStart = nowPerf();
    const res = await api.get(`${BASE}/meta`);
    const requestEnd = nowPerf();

    const roundTrip = requestEnd - requestStart;
    const serverTimeAtResponse = new Date(res.data.serverTime).getTime() + roundTrip / 2;

    serverTimeAtSyncMs = serverTimeAtResponse;
    localPerfAtSyncMs = requestEnd;
    lastSyncedAt = Date.now();

    return res.data;
  })();

  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
};

/**
 * Returns a Date representing the SERVER's current time, computed
 * using the last synced server anchor and monotonic elapsed time.
 * This avoids trusting the system clock after initial sync.
 */
export const getServerNow = () => {
  if (!serverTimeAtSyncMs) return new Date();
  const elapsedMs = nowPerf() - localPerfAtSyncMs;
  return new Date(serverTimeAtSyncMs + elapsedMs);
};

/**
 * Kicks off a sync if we've never synced, or if the cached offset is
 * older than SYNC_STALE_AFTER_MS. Safe to call repeatedly — it's a
 * no-op if a sync is already fresh or already in flight.
 */
export const ensureServerTimeSynced = () => {
  const stale = lastSyncedAt === 0 || Date.now() - lastSyncedAt > SYNC_STALE_AFTER_MS;
  if (!stale) return Promise.resolve();
  return syncServerTime().catch((err) => {
    console.error("[ServerClock] sync failed, falling back to last known offset:", err.message);
  });
};

// ─────────────────────────────────────────────────────────────────
// Reservation meta / actions
// ─────────────────────────────────────────────────────────────────

export const getReservationMeta = async () => {
  const res = await api.get(`${BASE}/meta`);
  return res.data;
};

export const createReservation = async (payload) => {
  const res = await api.post(`${BASE}/createReserve`, payload);
  return res.data;
};

export const getTodayReservations = async () => {
  const res = await api.get(`${BASE}/today`);
  return res.data;
};

export const getSeatAvailability = async (date, startTime, endTime) => {
  const res = await api.get(`${BASE}/availability`, { params: { date, startTime, endTime } });
  return res.data;
};

export const getSeatBookedSlots = async (seatId, date) => {
  const res = await api.get(`${BASE}/seat/${seatId}/slots`, { params: { date } });
  return res.data;
};

export const cancelReservation = async (reservationId) => {
  const res = await api.patch(`${BASE}/${reservationId}/cancel`);
  return res.data;
};

export const extendReservation = async (reservationId, extensionMinutes) => {
  const res = await api.patch(`${BASE}/${reservationId}/extend`, { extensionMinutes });
  return res.data;
};

export const rescheduleReservation = async (reservationId, { slotIndex, durationSlots }) => {
  const res = await api.patch(`${BASE}/${reservationId}/reschedule`, { slotIndex, durationSlots });
  return res.data;
};