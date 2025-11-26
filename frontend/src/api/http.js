/**
 * HTTP Client Module
 * Central place for all API fetch calls
 */

import tokenStorage from '../utils/token';

const API_BASE_URL = 'http://localhost:3000';

export const getBaseUrl = () => API_BASE_URL;

async function request(path, { method = 'GET', headers, body, credentials = 'include' } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  
  // Get access token and add to headers if available
  const accessToken = tokenStorage.getAccessToken();
  const authHeaders = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
  
  const opts = {
    method,
    credentials,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

export const http = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export default http;

