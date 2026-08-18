import axios from 'axios';

// When running via Vite dev server (npm run dev), use the Vite proxy '/api'
// In production, user passes VITE_API_URL. Automatically ensure '/api' is appended.
let rawBaseUrl = (import.meta.env.VITE_API_URL || '/api').trim();

// Normalize URL: remove trailing slashes
rawBaseUrl = rawBaseUrl.replace(/\/+$/, '');

// If user supplied a full domain without '/api' (e.g. https://xxx.onrender.com), auto-append '/api'
if (rawBaseUrl.startsWith('http') && !rawBaseUrl.endsWith('/api')) {
  rawBaseUrl = `${rawBaseUrl}/api`;
}

const API_BASE_URL = rawBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle API Errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      // Network error — backend not reachable
      return Promise.reject('Network error: Cannot connect to server. Please check your backend status and URL configuration.');
    }
    if (error.response.status === 401) {
      localStorage.removeItem('cf_token');
      localStorage.removeItem('cf_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(
      error.response?.data?.message || error.message || 'An unexpected error occurred'
    );
  }
);

export default api;
