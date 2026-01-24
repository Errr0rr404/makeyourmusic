import { create } from 'zustand';
import api from '../api';

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setToken: (token: string) => void;
  setAuth: (data: { user: User; accessToken: string; refreshToken?: string }) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  isAuthenticated: false,
  isLoading: false,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  setToken: (token: string) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token });
  },

  setAuth: (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, accessToken } = response.data;
      
      if (!accessToken || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { user, accessToken } = response.data;
      
      if (!accessToken || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ ...initialState, accessToken: null });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshResponse = await api.post('/auth/refresh', {}, { withCredentials: true });
          if (refreshResponse.data.accessToken) {
            const newToken = refreshResponse.data.accessToken;
            localStorage.setItem('accessToken', newToken);
            const retryResponse = await api.get('/auth/me');
            set({ user: retryResponse.data.user, accessToken: newToken, isAuthenticated: true, isLoading: false });
            return;
          }
        } catch (refreshError) {
          // Refresh failed, proceed to logout
        }
      }
      get().logout();
    }
  },
}));
