import axios from 'axios';

// Agent-portal axios instance — a separate auth domain from the admin `api`.
// Uses its own token (`agent_token`) and 401 event so admin + agent sessions
// never collide inside the same web app.
const agentApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

agentApi.interceptors.request.use(config => {
  const token = localStorage.getItem('agent_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

agentApi.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('agent_token');
      window.dispatchEvent(new Event('agent-unauthorized'));
    }
    return Promise.reject(err);
  },
);

// Re-export the shared message helper so agent pages don't import from two files.
export { apiError } from './api';

export default agentApi;
