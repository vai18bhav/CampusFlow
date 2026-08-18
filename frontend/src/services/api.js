import axios from 'axios';

// When running via Vite dev server (npm run dev), use the Vite proxy '/api'
// which proxies to http://localhost:5000. This avoids CORS issues completely.
// In production, set VITE_API_URL to your deployed backend URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
      return Promise.reject('Network error: Cannot connect to server. Make sure the backend is running on port 5000.');
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
