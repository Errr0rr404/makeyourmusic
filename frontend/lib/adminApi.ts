'use client';

import axios, { AxiosInstance } from 'axios';

// Separate axios client for the admin panel. Uses the same backend base URL
// as the regular `api` but talks ADMIN_PANEL_TOKEN instead of user JWT — the
// admin gate is its own auth surface (see backend/utils/adminAuth.ts).
//
// Admin token is held in sessionStorage instead of localStorage. localStorage
// persists across browser restarts and is reachable from any same-origin
// script — combined with the API server's `unsafe-inline` script CSP, an XSS
// could exfiltrate a long-lived admin token. sessionStorage scopes the token
// to the current tab and dies when the tab closes, dramatically shrinking the
// blast radius. The right end-state is an httpOnly Secure SameSite=Strict
// cookie issued by the backend `/admin/auth/verify` endpoint (server change
// required); this is the strongest fix possible client-side without backend
// coordination.

const ADMIN_TOKEN_KEY = 'admin_panel_token';
const HEADER = 'x-admin-token';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

function safeSessionGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    /* sessionStorage unavailable (private mode, etc.) — best-effort only */
  }
}

function safeSessionRemove(key: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

let _instance: AxiosInstance | null = null;

export function getAdminApi(): AxiosInstance {
  if (_instance) return _instance;

  const inst = axios.create({
    baseURL,
    withCredentials: false,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  inst.interceptors.request.use((config) => {
    const t = safeSessionGet(ADMIN_TOKEN_KEY);
    if (t) config.headers[HEADER] = t;
    return config;
  });

  inst.interceptors.response.use(
    (res) => res,
    (err) => {
      // Surface the lock signal so the panel can drop back to the password
      // gate without retrying. Anything else passes through.
      if (
        err?.response?.status === 401 &&
        err?.response?.data?.code === 'ADMIN_PANEL_LOCKED' &&
        typeof window !== 'undefined'
      ) {
        safeSessionRemove(ADMIN_TOKEN_KEY);
        window.dispatchEvent(new CustomEvent('admin:locked'));
      }
      return Promise.reject(err);
    }
  );

  _instance = inst;
  return inst;
}

export const adminAuth = {
  hasToken(): boolean {
    return Boolean(safeSessionGet(ADMIN_TOKEN_KEY));
  },
  setToken(token: string): void {
    safeSessionSet(ADMIN_TOKEN_KEY, token);
    // Migrate older installs that wrote to localStorage — clear stale copy.
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    } catch {
      /* ignore */
    }
  },
  clearToken(): void {
    safeSessionRemove(ADMIN_TOKEN_KEY);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
    } catch {
      /* ignore */
    }
  },
  async login(password: string): Promise<void> {
    const inst = getAdminApi();
    const res = await inst.post('/admin/auth/verify', { password });
    if (!res.data?.token) throw new Error('No token returned');
    this.setToken(res.data.token);
  },
};
