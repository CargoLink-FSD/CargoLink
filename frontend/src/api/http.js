/**
 * HTTP Client Module
 * Central place for all API fetch calls
 */

import tokenStorage from '../utils/token';
import { handleTokenRefresh } from '../utils/tokenRefresh';

const API_BASE_URL = 'http://localhost:3000';

export const getBaseUrl = () => API_BASE_URL;

async function request(path, { method = 'GET', headers, body, credentials = 'include', _retry = false } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  // Get access token and add to headers if available
  const accessToken = tokenStorage.getAccessToken();
  const authHeaders = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};

  // Check if body is FormData - don't stringify or set Content-Type
  const isFormData = body instanceof FormData;

  const opts = {
    method,
    credentials,
    headers: {
      // Only set Content-Type for non-FormData requests
      ...(!isFormData && { 'Content-Type': 'application/json' }),
      ...authHeaders,
      ...(headers || {}),
    },
    // Only stringify non-FormData bodies
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  };

  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  // Handle 401 Unauthorized - Token expired
  // Skip refresh logic for auth endpoints (login, signup, refresh-token)
  const isAuthEndpoint = path.includes('/auth/login') ||
    path.includes('/auth/signup') ||
    path.includes('/auth/refresh-token') ||
    path.includes('/register');

  if (res.status === 401 && !_retry && !isAuthEndpoint) {
    try {
      await handleTokenRefresh();
      // Retry original request with new token
      return request(path, { method, headers, body, credentials, _retry: true });
    } catch (refreshError) {
      throw refreshError;
    }
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
