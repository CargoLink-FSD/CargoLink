import http from './http.js';

export const getWallet = () => http.get('/api/wallets/me').then(r => r.data || r);

export const getTransactions = ({ page = 1, limit = 20 } = {}) =>
  http.get(`/api/wallets/me/transactions?page=${page}&limit=${limit}`).then(r => r.data || r);

export const getCashoutHistory = ({ page = 1, limit = 20 } = {}) =>
  http.get(`/api/wallets/me/cashouts?page=${page}&limit=${limit}`).then(r => r.data || r);

export const requestCashout = (amount) =>
  http.post('/api/wallets/me/cashout', { amount }).then(r => r.data || r);

export const updateBankDetails = (bankDetails) =>
  http.put('/api/wallets/me/bank-details', bankDetails).then(r => r.data || r);
