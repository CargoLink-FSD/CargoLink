const normalizeBaseUrl = (baseUrl) => (baseUrl || '').trim().replace(/\/+$/, '');

const configuredBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

const API_BASE_URL =
  configuredBaseUrl ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '');

export const getApiBaseUrl = () => API_BASE_URL;

export const toApiUrl = (path = '') => {
  if (!path) return API_BASE_URL;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!API_BASE_URL) {
    return path;
  }

  return path.startsWith('/') ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
};
