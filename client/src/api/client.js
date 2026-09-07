import axios from 'axios';

// Locally, Vite proxies the relative path to the Express server. In production,
// set VITE_API_BASE_URL to the deployed backend URL, including its /api suffix.
export const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
const api = axios.create({ baseURL: configuredApiBaseUrl || '/api' });

// True when the build points at a real backend. On a static host (Vercel/Netlify)
// the '/api' fallback does NOT exist — Vite's dev proxy only works on localhost.
export const isApiConfigured = Boolean(configuredApiBaseUrl);
export const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
export const apiBaseLabel = configuredApiBaseUrl || `${window.location.origin}/api (fallback — dev proxy only)`;

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

/** Download a backend export (JSON payload or CSV/attachment) as a file. */
export async function downloadExport(path, fallbackFilename = 'export') {
  const res = await api.get(path, { responseType: 'blob' });
  const disposition = res.headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] || fallbackFilename;
  const blob = new Blob([res.data], { type: res.headers?.['content-type'] || 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return filename;
}

export default api;
