import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Use relative path for API calls to support all environments
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Track if we're currently refreshing the token to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { 
      _retry?: boolean;
      _retryCount?: number;
    };

    // Retry logic for network errors or 5xx errors
    if (
      originalRequest &&
      (!error.response || (error.response.status >= 500 && error.response.status < 600)) &&
      (!originalRequest._retryCount || originalRequest._retryCount < MAX_RETRIES)
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, originalRequest._retryCount - 1);
      await sleep(delay);
      
      return api(originalRequest);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Don't redirect on auth endpoints - let them handle their own errors
      const url = originalRequest.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || 
                            url.includes('/auth/register') || 
                            url.includes('/auth/refresh');
      
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        // Token expired - try to refresh
        if (!isRefreshing) {
          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Attempt to refresh the token using the refresh token cookie
            const response = await axios.post(`/api/auth/refresh`, {}, {
              withCredentials: true,
            });

            const { accessToken } = response.data;
            
            if (accessToken) {
              localStorage.setItem('accessToken', accessToken);
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              
              // Process queued requests
              processQueue(null, accessToken);
              
              // Retry the original request
              return api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            processQueue(refreshError as AxiosError, null);
            localStorage.removeItem('accessToken');
            
            // Only redirect if we're not already on the login page
            if (window.location.pathname !== '/login' && 
                !window.location.pathname.includes('/manage')) {
              window.location.href = '/login';
            }
            
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        } else {
          // Already refreshing - queue this request
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Export both named and default for flexibility
export { api };
export default api;
