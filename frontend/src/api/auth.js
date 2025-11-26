//Authentication API Endpoints
//All auth-related API calls (login, signup, logout, refreshToken)
 

import { http } from './http';
import tokenStorage from '../utils/token';

export const login = async ({ email, password, role }) => {
  const data = await http.post('/api/auth/login', { email, password, role });
  return data.data;
};

export const signup = async ({ signupData, userType }) => {
  const data = await http.post(`/api/${userType}s/register`, signupData);
  return data.data;
};

export const logout = async () => {
  const refreshToken = tokenStorage.getRefreshToken();
  await http.post('/api/auth/logout', { refreshToken });
  return null;
};

export const refreshToken = async () => {
  const refreshToken = tokenStorage.getRefreshToken();
  const data = await http.post('/api/auth/refresh-token', { refreshToken });
  return data.data;
};

export const forgotPassword = async ({ email, userType }) => {
  const data = await http.post('/api/auth/forgot-password', { email });
  return data;
};

export const resetPassword = async ({ token, password }) => {
  const data = await http.post(`/api/auth/reset-password/${token}`, { password });
  return data;
};

export default { login, signup, logout, refreshToken, forgotPassword, resetPassword };

