import { createApi, getApi } from '@morlo/shared';

// Initialize the shared API client with the web-specific base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Log API URL in development for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('API Base URL:', API_URL);
}

// Create the singleton on module load
const api = createApi(API_URL);

// Re-export so existing `import api from '@/lib/api'` keeps working
export { api, getApi };
export default api;
