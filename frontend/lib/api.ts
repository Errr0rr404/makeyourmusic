import { createApi, getApi } from '@makeyourmusic/shared';

// Initialize the shared API client with the web-specific base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// API URL is read from env at module-load. No verbose console log — devtools
// network tab already shows the base URL on every request.

// Create the singleton on module load
const api = createApi(API_URL);

// Re-export so existing `import api from '@/lib/api'` keeps working
export { api, getApi };
export default api;
