import axios from 'axios';

// Shared backend (../infra/server). In dev, Vite proxies /api → :4000.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

// Attach the admin JWT (set after admin login) to every request.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On an expired/invalid token, clear the session and let the app redirect to
// /login (AuthContext listens for this event). Other errors pass through so
// callers can show a toast with the server message.
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.dispatchEvent(new Event('admin-unauthorized'));
    }
    return Promise.reject(err);
  },
);

// Pull a human-readable message out of an axios error.
export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default api;
