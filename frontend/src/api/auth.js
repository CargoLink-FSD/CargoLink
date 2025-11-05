/**
 * Authentication API Endpoints
 * All auth-related API calls (login, signup, logout, getCurrentUser)
 */

import { http } from './http';

export const getCurrentUser = async () => {
  const data = await http.get('/api/auth/me');
  return data.user;
};

export const login = async ({ email, password, type }) => {
  const endpoint = type === 'admin' ? '/admin/login' : `/${type}/login`;
  const data = await http.post(endpoint, { email, password });
  return data.user;
};

export const signup = async ({ signupData, userType }) => {
  const data = await http.post(`/${userType}/signup`, signupData);
  return data.user;
};

export const logout = async () => {
  await http.post('/logout');
  return null;
};

export const forgotPassword = async ({ email, userType }) => {
  const endpoint = `/${userType}/forgot-password`;
  const data = await http.post(endpoint, { email, userType });
  return data;
};

export default { getCurrentUser, login, signup, logout, forgotPassword };

