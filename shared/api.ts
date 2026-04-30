import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getStorage } from './storage';

const TOKEN_KEY = 'accessToken';

let _apiInstance: AxiosInstance | null = null;

// Callback registered by authStore so the refresh interceptor can push a new
// access token back into the store. Keeps the api module free of a cyclic
// import on authStore (which itself imports getApi).
let _onTokenRefreshed: ((token: string) => void) | null = null;
let _onTokenRefreshFailed: (() => void) | null = null;
export function onTokenRefreshed(cb: (token: string) => void): void {
  _onTokenRefreshed = cb;
}
export function onTokenRefreshFailed(cb: () => void): void {
  _onTokenRefreshFailed = cb;
}

/**
 * Create and configure the shared Axios API client.
 * Call once on app boot with the correct baseURL.
 *   - Web:    createApi('http://localhost:3001/api') or ('/api')
 *   - Mobile: createApi('https://your-backend.railway.app/api')
 */
export function createApi(baseURL: string): AxiosInstance {
  const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  // ─── Request interceptor ────────────────────────────────
  api.interceptors.request.use(async (config) => {
    const storage = getStorage();
    const token = await storage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // ─── Retry + refresh interceptor ────────────────────────
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let isRefreshing = false;
  let failedQueue: Array<{
    resolve: (v?: unknown) => void;
    reject: (r?: unknown) => void;
  }> = [];

  const processQueue = (err: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token)));
    failedQueue = [];
  };

  // Methods we'll retry on 5xx / network errors. Non-idempotent verbs (POST,
  // PATCH, DELETE) are excluded — retrying a POST that the server already
  // committed but failed to ACK can double-tip, double-comment, double-charge.
  // A consumer that knows their POST is safe-to-retry can opt in by setting
  // `config.metadata.idempotent = true` (or by using PUT with an idempotency
  // key handled server-side).
  const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options', 'put']);

  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
        _retryCount?: number;
        metadata?: { idempotent?: boolean };
      };

      const method = (original?.method || 'get').toLowerCase();
      const isIdempotent =
        IDEMPOTENT_METHODS.has(method) || original?.metadata?.idempotent === true;

      // Retry 5xx / network errors — only for idempotent methods.
      if (
        original &&
        isIdempotent &&
        (!error.response || error.response.status >= 500) &&
        (!original._retryCount || original._retryCount < MAX_RETRIES)
      ) {
        original._retryCount = (original._retryCount || 0) + 1;
        await sleep(RETRY_DELAY * Math.pow(2, original._retryCount - 1));
        return api(original);
      }

      // 401 — try token refresh
      if (error.response?.status === 401 && original && !original._retry) {
        const url = original.url || '';
        const isAuthEndpoint =
          url.includes('/auth/login') ||
          url.includes('/auth/register') ||
          url.includes('/auth/refresh');

        if (!isAuthEndpoint) {
          if (!isRefreshing) {
            original._retry = true;
            isRefreshing = true;

            try {
              const res = await axios.post(
                `${baseURL}/auth/refresh`,
                {},
                { withCredentials: true }
              );
              const { accessToken } = res.data;
              if (accessToken) {
                const storage = getStorage();
                await storage.setItem(TOKEN_KEY, accessToken);
                original.headers.Authorization = `Bearer ${accessToken}`;
                processQueue(null, accessToken);
                // Push the refreshed token into authStore (registered via
                // onTokenRefreshed). No-op if the consumer never registered.
                try {
                  _onTokenRefreshed?.(accessToken);
                } catch { /* never let store updates break the request flow */ }
                return api(original);
              }
            } catch (refreshErr) {
              processQueue(refreshErr as AxiosError, null);
              // Only sign the user out when the refresh endpoint says the
              // refresh token itself is invalid (401/403). Network failures
              // and 5xx are transient — clearing the access token in those
              // cases boots the user out for blips on flaky connections.
              const refreshStatus = (refreshErr as AxiosError)?.response?.status;
              const refreshIsInvalid = refreshStatus === 401 || refreshStatus === 403;
              if (refreshIsInvalid) {
                const storage = getStorage();
                await storage.removeItem(TOKEN_KEY);
                try {
                  _onTokenRefreshFailed?.();
                } catch { /* never let store updates break the request flow */ }
              }
              return Promise.reject(refreshErr);
            } finally {
              isRefreshing = false;
            }
          } else {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then((token) => {
              if (original.headers) {
                original.headers.Authorization = `Bearer ${token}`;
              }
              return api(original);
            });
          }
        }
      }

      return Promise.reject(error);
    }
  );

  _apiInstance = api;
  return api;
}

/**
 * Get the singleton API instance. Throws if createApi() hasn't been called.
 */
export function getApi(): AxiosInstance {
  if (!_apiInstance) {
    throw new Error('API not initialized. Call createApi(baseURL) first.');
  }
  return _apiInstance;
}

export default { createApi, getApi };
