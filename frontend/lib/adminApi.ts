'use client';

import axios, { AxiosInstance } from 'axios';

// Separate axios client for the admin panel. Uses the same backend base URL
// as the regular `api` but talks ADMIN_PANEL_TOKEN instead of user JWT — the
// admin gate is its own auth surface (see backend/utils/adminAuth.ts).

const ADMIN_TOKEN_KEY = 'admin_panel_token';
const HEADER = 'x-admin-token';

const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (t) config.headers[HEADER] = t;
    }
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
        localStorage.removeItem(ADMIN_TOKEN_KEY);
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
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY));
  },
  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  },
  clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  },
  async login(password: string): Promise<void> {
    const inst = getAdminApi();
    const res = await inst.post('/admin/auth/verify', { password });
    if (!res.data?.token) throw new Error('No token returned');
    this.setToken(res.data.token);
  },
};
