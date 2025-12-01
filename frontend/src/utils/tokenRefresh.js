/**
 * Token Refresh Utility
 * Handles automatic token refresh logic
 */

import tokenStorage from './token';

const API_BASE_URL = 'http://localhost:3000';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const refreshTokenRequest = async () => {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await res.json();
  return data.data;
};

export const handleTokenRefresh = async () => {
  if (isRefreshing) {
    // Wait for the ongoing token refresh
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const tokenData = await refreshTokenRequest();
    tokenStorage.setTokens(tokenData.accessToken, tokenData.refreshToken);
    processQueue(null, tokenData.accessToken);
    isRefreshing = false;
    return tokenData.accessToken;
  } catch (refreshError) {
    processQueue(refreshError, null);
    isRefreshing = false;
    tokenStorage.clearTokens();
    window.location.href = '/login';
    throw refreshError;
  }
};
