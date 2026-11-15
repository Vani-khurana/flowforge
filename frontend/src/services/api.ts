import axios from 'axios';

/**
 * Intelligent API Base URL resolver:
 * 1. Explicit VITE_API_BASE_URL env variable (if set in Vercel or local .env)
 * 2. In browser environments: If accessed from non-localhost (e.g. Vercel deployment, mobile phone, custom domain),
 *    route automatically to the live backend service.
 * 3. Default fallback for local dev: http://localhost:5000/api
 */
const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.startsWith('192.168.')) {
      return 'https://flowforge-lovat.vercel.app/api';
    }
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flowforge_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for unified response/error unwrapping
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: trigger logout redirect if session expired
      // localStorage.removeItem('flowforge_token');
    }
    return Promise.reject(error);
  }
);
