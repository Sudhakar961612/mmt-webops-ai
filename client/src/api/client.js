import axios from 'axios';

// Locally, Vite proxies the relative path to the Express server. In production,
// set VITE_API_BASE_URL to the deployed backend URL, including its /api suffix.
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const api = axios.create({ baseURL: configuredApiBaseUrl || '/api' });

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mmt_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the session and redirect to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mmt_token');
      localStorage.removeItem('mmt_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export function getErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback;
}

export default api;
