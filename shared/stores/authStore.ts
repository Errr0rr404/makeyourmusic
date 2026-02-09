import { create } from 'zustand';
import { getApi } from '../api';
import { getStorage } from '../storage';
import type { User } from '../types';

const TOKEN_KEY = 'accessToken';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setAuth: (data: { user: User; accessToken: string }) => Promise<void>;
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
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  register: async (email, password, username, displayName) => {
    set({ isLoading: true });
    try {
      const api = getApi();
      const res = await api.post('/auth/register', { email, password, username, displayName });
      const { user, accessToken } = res.data;
      const storage = getStorage();
      await storage.setItem(TOKEN_KEY, accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Registration failed');
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
  },

  fetchUser: async () => {
    const storage = getStorage();
    const token = await storage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ isLoading: true, accessToken: token });
    try {
      const api = getApi();
      const res = await api.get('/auth/me');
      set({ user: res.data.user, accessToken: token, isAuthenticated: true, isLoading: false });
    } catch {
      await storage.removeItem(TOKEN_KEY);
      set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
