// =====================================================================
//  API client (axios)
//  - Reads the base URL from VITE_API_URL.
//  - Attaches the JWT to every request automatically.
//  - On a 401 response, clears the stored session and redirects to login.
// =====================================================================
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach token from localStorage to each outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fyp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle expired / invalid sessions globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('fyp_token');
      localStorage.removeItem('fyp_user');
      // Avoid redirect loop if already on an auth page
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
