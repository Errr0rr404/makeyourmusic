import { create } from 'zustand';
import { getApi, onTokenRefreshed, onTokenRefreshFailed } from '../api';
import { getStorage } from '../storage';
import type { User } from '../types';
import { usePlayerStore } from './playerStore';

const TOKEN_KEY = 'accessToken';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, displayName?: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setAuth: (data: { user: User; accessToken: string }) => Promise<void>;
  /** Exchange a Firebase ID token (Google/Apple sign-in) for an app session */
  firebaseSignIn: (idToken: string) => Promise<void>;
  /** Update just the access token (e.g. after a silent refresh) */
  setAccessToken: (token: string) => void;
  /** Called once on boot to hydrate token from storage */
  hydrate: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,

  hydrate: async () => {
    try {
      const storage = getStorage();
      const token = await storage.getItem(TOKEN_KEY);
      if (token) {
        set({ accessToken: token, isAuthenticated: true });
      }
    } catch (err) {
      console.error('Failed to hydrate auth:', err);
    }
  },

  setAccessToken: (token: string) => {
    set({ accessToken: token });
    // Persist so a subsequent hydrate() reads the new token. The api refresh
    // interceptor also writes to storage, but direct callers (e.g. mobile
    // sign-in flows) used to forget — making this idempotent here is safer
    // than relying on every caller to remember.
    void getStorage().setItem(TOKEN_KEY, token);
  },

  setAuth: async (data) => {
    const storage = getStorage();
    await storage.setItem(TOKEN_KEY, data.accessToken);
    set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const api = getApi();
      const res = await api.post('/auth/login', { email, password });
      const { user, accessToken } = res.data;
      const storage = getStorage();
      await storage.setItem(TOKEN_KEY, accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error?.response?.data?.error || error?.message || 'Login failed');
    }
  },

  firebaseSignIn: async (idToken) => {
    set({ isLoading: true });
    try {
      const api = getApi();
      const res = await api.post('/auth/firebase/exchange', { idToken });
      const { user, accessToken } = res.data;
      const storage = getStorage();
      await storage.setItem(TOKEN_KEY, accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error?.response?.data?.error || error?.message || 'Sign-in failed');
    }
  },

  register: async (email, password, username, displayName, referralCode) => {
    set({ isLoading: true });
    try {
      const api = getApi();
      const res = await api.post('/auth/register', {
        email, password, username, displayName, referralCode,
      });
      const { user, accessToken } = res.data;
      const storage = getStorage();
      await storage.setItem(TOKEN_KEY, accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error?.response?.data?.error || error?.message || 'Registration failed');
    }
  },

  logout: async () => {
    try {
      const api = getApi();
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    const storage = getStorage();
    await storage.removeItem(TOKEN_KEY);
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    usePlayerStore.getState().resetPlayer();
  },

  fetchUser: async () => {
    const storage = getStorage();
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    // Optimistically mark as authenticated from the stored token while we
    // validate against the server. If validation fails for a reason other
    // than 401 (network blip, backend down, 5xx), keep the user signed in —
    // logging them out on transient errors is the easiest way to ruin a
    // session.
    set({ isLoading: true, accessToken: token, isAuthenticated: true });
    try {
      const api = getApi();
      const res = await api.get('/auth/me');
      set({ user: res.data.user, accessToken: token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        // Token is genuinely invalid — clear and require re-auth. The 401
        // response interceptor in api.ts already attempted a refresh by the
        // time we get here, so reaching this branch means refresh also
        // failed authoritatively.
        await storage.removeItem(TOKEN_KEY);
        set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
      } else {
        // Network error / 5xx / timeout — keep the token, stay logged in.
        set({ isLoading: false });
      }
    }
  },
}));

// Sync the access token back into the store whenever the api client silently
// refreshes it. The api module fires this; the store stays the source of
// truth for `accessToken`.
onTokenRefreshed((token) => {
  useAuthStore.getState().setAccessToken(token);
});

// When token refresh fails (e.g., refresh token expired), clear auth state
onTokenRefreshFailed(() => {
  useAuthStore.getState().logout();
});
