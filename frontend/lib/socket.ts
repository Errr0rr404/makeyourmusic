// Thin socket.io-client wrapper. Lazy-imported by features that actually
// need realtime — keeps socket.io out of the main bundle.

import type { Socket } from 'socket.io-client';

let pendingImport: Promise<typeof import('socket.io-client')> | null = null;

async function loadIo() {
  if (!pendingImport) pendingImport = import('socket.io-client');
  return pendingImport;
}

function socketBase(): string {
  // socket.io-client expects an HTTP(S) origin, not the API path. We strip the
  // /api suffix so the same NEXT_PUBLIC_API_URL setting works for both.
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  if (apiUrl.startsWith('/')) {
    if (typeof window === 'undefined') return 'http://localhost:3001';
    return window.location.origin;
  }
  try {
    const u = new URL(apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3001';
  }
}

export interface PartySocketAuth {
  token?: string | null;
  guestKey?: string | null;
}

export async function connectPartiesNamespace(
  code: string,
  auth: PartySocketAuth
): Promise<Socket> {
  const { io } = await loadIo();
  const socket = io(`${socketBase()}/parties`, {
    transports: ['websocket'],
    auth: {
      token: auth.token || undefined,
      guestKey: auth.guestKey || undefined,
    },
    query: { code: code.toUpperCase() },
    // Reconnect aggressively for ~30s then back off; matches the cron sweep
    // window for stale parties so a brief network drop doesn't kick the user.
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
  });
  return socket;
}

export interface DjSocketAuth {
  token?: string | null;
}

export async function connectDjNamespace(code: string, auth: DjSocketAuth): Promise<Socket> {
  const { io } = await loadIo();
  const socket = io(`${socketBase()}/dj`, {
    transports: ['websocket'],
    auth: { token: auth.token || undefined },
    query: { code: code.toUpperCase() },
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4_000,
  });
  return socket;
}
