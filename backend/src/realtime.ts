// Socket.IO realtime layer for listening parties.
//
// Architecture: a `/parties` namespace where each party is a room keyed by
// the party id. The host is the authoritative source for `positionMs` and
// `isPlaying` — we never tick a server clock. Members trust the latest
// `state` event and locally interpolate the playhead between ticks.
//
// Persistence: we update `ListeningParty.positionMs` / `isPlaying` /
// `lastTickAt` from `host:tick` events at most once every PERSIST_INTERVAL_MS
// to avoid hammering the DB at 60Hz. The cron sweep ends parties whose
// `lastTickAt` is older than 30min.
//
// Auth: bearer-token-style — the client passes `auth.token` (JWT) on
// connect; we verify and attach `userId`. Anonymous joiners pass
// `auth.guestKey` instead and we trust the cookie-derived hash. The party's
// hostUserId is the only allowed `userId` for host:* events; everyone else
// is read-only.

import http from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from './utils/jwt';
import { prisma } from './utils/db';
import logger from './utils/logger';

interface AuthedSocketData {
  userId?: string;
  guestKey?: string;
  partyId?: string;
}

type PartySocket = Socket & { data: AuthedSocketData };

// Throttle DB writes per party. Member counts of 50+ x ticks/5s would
// otherwise mean 600 UPDATEs/min just for one party.
const PERSIST_INTERVAL_MS = 30_000;
const lastPersisted = new Map<string, number>();

// Cap on parties tracked in memory before we reject new connections — guard
// against runaway socket counts on a misbehaving deploy. 10k parties at
// ~50 members each is well within a single Node process.
const MAX_PARTIES_IN_MEMORY = 10_000;

let io: Server | null = null;

export function attachSocketIo(server: http.Server): void {
  if (io) return;
  io = new Server(server, {
    // Accept the same origins as the REST CORS layer; mirror the env-var
    // logic from server.ts. CORS is off-by-default in socket.io but reads
    // the request's Origin header on the WebSocket upgrade.
    cors: {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        const allowed = (process.env.FRONTEND_URL || 'http://localhost:3000')
          .split(',')
          .map((u) => u.trim());
        cb(null, allowed.includes(origin));
      },
      credentials: true,
    },
    // 30s ping; mobile/web clients reconnect automatically. Lower than the
    // 30min cron sweep so a stale host disappears quickly from the room.
    pingInterval: 25_000,
    pingTimeout: 30_000,
  });

  const parties = io.of('/parties');

  parties.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) || undefined;
      const guestKey = (socket.handshake.auth?.guestKey as string | undefined) || undefined;
      if (token) {
        const decoded = await verifyAccessToken(token);
        (socket.data as AuthedSocketData).userId = decoded.userId;
      } else if (guestKey && /^[a-f0-9]{16,64}$/i.test(guestKey)) {
        (socket.data as AuthedSocketData).guestKey = guestKey;
      } else {
        // No auth → anonymous read-only viewer with a synthetic guest key.
        // The REST /parties/:code/join endpoint also accepts anon, so this
        // matches the HTTP semantics.
        (socket.data as AuthedSocketData).guestKey = `anon-${socket.id}`;
      }
      next();
    } catch (err) {
      logger.warn('parties: socket auth failed', { error: (err as Error).message });
      next(new Error('Unauthorized'));
    }
  });

  parties.on('connection', (socket) => {
    handleConnection(socket as PartySocket).catch((err) =>
      logger.warn('parties: connection handler crashed', { error: (err as Error).message })
    );
  });

  attachDjNamespace(io);

  logger.info('Socket.IO /parties + /dj namespaces attached');
}

// ─── /dj namespace ──────────────────────────────────────
//
// DJ sessions are simpler than parties: there's no synced playhead — the
// host's player is authoritative. We just broadcast `dj:slot-ready` events
// when a queued generation completes (so members can pre-buffer) and
// `dj:vibe-changed` when the host updates the live vibe direction.

interface DjSocketData {
  userId?: string;
  sessionId?: string;
}
type DjSocket = Socket & { data: DjSocketData };

function attachDjNamespace(server: Server): void {
  const dj = server.of('/dj');

  dj.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) || undefined;
      if (token) {
        const decoded = await verifyAccessToken(token);
        (socket.data as DjSocketData).userId = decoded.userId;
      }
      next();
    } catch (err) {
      // Anonymous viewers are fine; only host-only events check userId.
      logger.debug('dj: socket auth fell through', { error: (err as Error).message });
      next();
    }
  });

  dj.on('connection', (socket) => {
    handleDjConnection(socket as DjSocket).catch((err) =>
      logger.warn('dj: connection handler crashed', { error: (err as Error).message })
    );
  });
}

async function handleDjConnection(socket: DjSocket): Promise<void> {
  const code = socket.handshake.query.code as string | undefined;
  if (!code || !/^[A-Z0-9]{4,16}$/i.test(code)) {
    socket.emit('error', { error: 'Missing or invalid DJ session code' });
    socket.disconnect(true);
    return;
  }
  const session = await prisma.djSession.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, hostUserId: true, status: true, currentVibe: true },
  });
  if (!session || session.status === 'ENDED') {
    socket.emit('error', { error: 'Session not found or ended' });
    socket.disconnect(true);
    return;
  }
  socket.data.sessionId = session.id;
  socket.join(session.id);

  const isHost = !!socket.data.userId && socket.data.userId === session.hostUserId;
  socket.emit('hello', {
    sessionId: session.id,
    hostUserId: session.hostUserId,
    isHost,
    currentVibe: session.currentVibe,
  });

  // Host events fan out to members. We trust the host's player to drive
  // playback timing; the server is just a passthrough.
  socket.on('host:tick', (msg: { position: number }) => {
    if (!isHost) return;
    void prisma.djSession
      .update({ where: { id: session.id }, data: { lastTickAt: new Date() } })
      .catch(() => undefined);
    socket.to(session.id).emit('dj:tick', { position: msg?.position });
  });

  socket.on('host:slot-ready', (msg: { slotId: string; audioUrl: string; position: number }) => {
    if (!isHost) return;
    socket.to(session.id).emit('dj:slot-ready', msg);
  });

  socket.on('host:vibe-changed', (msg: { vibe: string }) => {
    if (!isHost) return;
    socket.to(session.id).emit('dj:vibe-changed', { vibe: msg?.vibe });
  });

  socket.on('disconnect', () => {
    socket.to(session.id).emit('dj:listener-left', { userId: socket.data.userId });
  });
}

export function broadcastDjSessionEnded(sessionId: string): void {
  if (!io) return;
  io.of('/dj').to(sessionId).emit('dj:ended', { sessionId });
  io.of('/dj').in(sessionId).disconnectSockets(true);
}

async function handleConnection(socket: PartySocket): Promise<void> {
  const partyCode = socket.handshake.query.code as string | undefined;
  if (!partyCode || !/^[A-Z0-9]{4,16}$/i.test(partyCode)) {
    socket.emit('error', { error: 'Missing or invalid party code' });
    socket.disconnect(true);
    return;
  }

  const party = await prisma.listeningParty.findUnique({
    where: { code: partyCode.toUpperCase() },
    select: {
      id: true,
      hostUserId: true,
      status: true,
      isPlaying: true,
      positionMs: true,
      trackId: true,
    },
  });
  if (!party || party.status === 'ENDED') {
    socket.emit('error', { error: 'Party not found or ended' });
    socket.disconnect(true);
    return;
  }

  if (lastPersisted.size >= MAX_PARTIES_IN_MEMORY) {
    // Rough capacity guard — drop tracking on the oldest party.
    const oldestKey = lastPersisted.keys().next().value;
    if (oldestKey) lastPersisted.delete(oldestKey);
  }

  socket.data.partyId = party.id;
  socket.join(party.id);

  const isHost = !!socket.data.userId && socket.data.userId === party.hostUserId;

  // Snapshot to the joiner; the room broadcast is just a presence ping.
  socket.emit('state', {
    partyId: party.id,
    hostUserId: party.hostUserId,
    isPlaying: party.isPlaying,
    positionMs: party.positionMs,
    trackId: party.trackId,
    isHost,
    serverTime: Date.now(),
  });
  socket.to(party.id).emit('member:joined', {
    userId: socket.data.userId,
    guestKey: socket.data.guestKey,
  });

  socket.on('host:play', (msg: { positionMs?: number }) => {
    if (!isHost) return;
    void onHostStateChange(socket, party.id, {
      isPlaying: true,
      positionMs: typeof msg?.positionMs === 'number' ? Math.max(0, msg.positionMs) : undefined,
    });
  });

  socket.on('host:pause', (msg: { positionMs?: number }) => {
    if (!isHost) return;
    void onHostStateChange(socket, party.id, {
      isPlaying: false,
      positionMs: typeof msg?.positionMs === 'number' ? Math.max(0, msg.positionMs) : undefined,
    });
  });

  socket.on('host:seek', (msg: { positionMs: number }) => {
    if (!isHost) return;
    if (typeof msg?.positionMs !== 'number' || !Number.isFinite(msg.positionMs)) return;
    void onHostStateChange(socket, party.id, { positionMs: Math.max(0, Math.floor(msg.positionMs)) });
  });

  socket.on('host:track', (msg: { trackId: string | null }) => {
    if (!isHost) return;
    void onHostTrackChange(socket, party.id, msg?.trackId ?? null);
  });

  socket.on('host:tick', (msg: { positionMs: number; isPlaying: boolean }) => {
    if (!isHost) return;
    if (typeof msg?.positionMs !== 'number' || !Number.isFinite(msg.positionMs)) return;
    // Broadcast every tick so members can interpolate; persist throttled.
    socket.to(party.id).emit('state', {
      partyId: party.id,
      hostUserId: party.hostUserId,
      isPlaying: !!msg.isPlaying,
      positionMs: Math.max(0, Math.floor(msg.positionMs)),
      trackId: party.trackId,
      serverTime: Date.now(),
    });
    void persistTick(party.id, msg.positionMs, !!msg.isPlaying);
  });

  socket.on('disconnect', () => {
    socket.to(party.id).emit('member:left', {
      userId: socket.data.userId,
      guestKey: socket.data.guestKey,
    });
  });
}

async function onHostStateChange(
  _socket: PartySocket,
  partyId: string,
  patch: { isPlaying?: boolean; positionMs?: number }
): Promise<void> {
  try {
    const updated = await prisma.listeningParty.update({
      where: { id: partyId },
      data: {
        ...(typeof patch.isPlaying === 'boolean' ? { isPlaying: patch.isPlaying } : {}),
        ...(typeof patch.positionMs === 'number' ? { positionMs: patch.positionMs } : {}),
        lastTickAt: new Date(),
      },
      select: {
        id: true,
        hostUserId: true,
        isPlaying: true,
        positionMs: true,
        trackId: true,
      },
    });
    lastPersisted.set(partyId, Date.now());
    parties()?.to(partyId).emit('state', {
      partyId: updated.id,
      hostUserId: updated.hostUserId,
      isPlaying: updated.isPlaying,
      positionMs: updated.positionMs,
      trackId: updated.trackId,
      serverTime: Date.now(),
    });
  } catch (err) {
    logger.warn('parties: state-change persist failed', { partyId, error: (err as Error).message });
  }
}

async function onHostTrackChange(
  socket: PartySocket,
  partyId: string,
  trackId: string | null
): Promise<void> {
  try {
    // Validate track exists + is public (or owned by host) before broadcasting.
    if (trackId) {
      const t = await prisma.track.findUnique({
        where: { id: trackId },
        select: { id: true, isPublic: true, status: true, agent: { select: { ownerId: true } } },
      });
      if (!t) return;
      const ownerOk = !!socket.data.userId && t.agent?.ownerId === socket.data.userId;
      if ((!t.isPublic || t.status !== 'ACTIVE') && !ownerOk) return;
    }
    const updated = await prisma.listeningParty.update({
      where: { id: partyId },
      data: { trackId, positionMs: 0, isPlaying: false, lastTickAt: new Date() },
      select: {
        id: true,
        hostUserId: true,
        isPlaying: true,
        positionMs: true,
        trackId: true,
      },
    });
    parties()?.to(partyId).emit('state', {
      partyId: updated.id,
      hostUserId: updated.hostUserId,
      isPlaying: updated.isPlaying,
      positionMs: updated.positionMs,
      trackId: updated.trackId,
      serverTime: Date.now(),
    });
  } catch (err) {
    logger.warn('parties: track-change persist failed', { partyId, error: (err as Error).message });
  }
}

async function persistTick(partyId: string, positionMs: number, isPlaying: boolean): Promise<void> {
  const last = lastPersisted.get(partyId) || 0;
  const now = Date.now();
  if (now - last < PERSIST_INTERVAL_MS) return;
  lastPersisted.set(partyId, now);
  try {
    await prisma.listeningParty.update({
      where: { id: partyId },
      data: {
        positionMs: Math.max(0, Math.floor(positionMs)),
        isPlaying,
        lastTickAt: new Date(),
      },
    });
  } catch (err) {
    // Most likely cause: party was ended out-of-band. Drop the tracker so a
    // re-created party with the same id (impossible — ids are cuids) wouldn't
    // inherit stale throttle state.
    lastPersisted.delete(partyId);
    logger.debug('parties: tick persist skipped', { partyId, error: (err as Error).message });
  }
}

function parties() {
  return io ? io.of('/parties') : null;
}

// Called by the cron sweep when it ends a party server-side; pushes a final
// state event so clients can disconnect cleanly.
export function broadcastPartyEnded(partyId: string): void {
  parties()?.to(partyId).emit('party:ended', { partyId });
  // Disconnect all sockets in the room.
  parties()?.in(partyId).disconnectSockets(true);
  lastPersisted.delete(partyId);
}
