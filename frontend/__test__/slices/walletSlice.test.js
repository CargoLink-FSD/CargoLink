import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/wallet', () => ({
  getWallet: vi.fn(),
  getTransactions: vi.fn(),
  getCashoutHistory: vi.fn(),
  requestCashout: vi.fn(),
  updateBankDetails: vi.fn(),
}));

import * as walletApi from '../../src/api/wallet';
import walletReducer, {
  clearCashoutState,
  clearBankDetailsSuccess,
  fetchWallet,
  fetchTransactions,
  fetchCashoutHistory,
  submitCashoutRequest,
  saveBankDetails,
} from '../../src/store/slices/walletSlice';

const makeStore = (preloadedState) =>
  configureStore({
    reducer: { wallet: walletReducer },
    preloadedState,
  });

describe('store/walletSlice', () => {
  it('fetchWallet success stores wallet and bankDetails', async () => {
    walletApi.getWallet.mockResolvedValue({
      wallet: { balance: 5000 },
      bankDetails: { accountNumber: '123' },
    });

    const store = makeStore();
    await store.dispatch(fetchWallet());

    const state = store.getState().wallet;
    expect(state.wallet).toEqual({ balance: 5000 });
    expect(state.bankDetails).toEqual({ accountNumber: '123' });
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchWallet failure stores error message', async () => {
    walletApi.getWallet.mockRejectedValue(new Error('server-error'));

    const store = makeStore();
    await store.dispatch(fetchWallet());

    expect(store.getState().wallet.error).toBe('server-error');
    expect(store.getState().wallet.wallet).toBeNull();
  });

  it('fetchTransactions success populates transactions and meta', async () => {
    walletApi.getTransactions.mockResolvedValue({
      items: [{ id: 't1', amount: 500 }],
      total: 1,
      page: 1,
      pages: 1,
    });

    const store = makeStore();
    await store.dispatch(fetchTransactions({ page: 1 }));

    const state = store.getState().wallet;
    expect(state.transactions).toHaveLength(1);
    expect(state.transactionsMeta).toEqual({ total: 1, page: 1, pages: 1 });
  });

  it('submitCashoutRequest success sets cashoutSuccess and reduces balance', async () => {
    walletApi.requestCashout.mockResolvedValue({
      data: { cashout: { requested_amount: 1000 } },
    });

    const store = makeStore({
      wallet: {
        wallet: { balance: 5000 },
        bankDetails: null,
        transactions: [],
        transactionsMeta: {},
        cashouts: [],
        cashoutsMeta: {},
        loading: false,
        txLoading: false,
        cashoutLoading: false,
        cashoutSubmitting: false,
        bankDetailsLoading: false,
        error: null,
        cashoutError: null,
        cashoutSuccess: null,
        bankDetailsSuccess: false,
      },
    });

    await store.dispatch(submitCashoutRequest(1000));

    const state = store.getState().wallet;
    expect(state.cashoutSubmitting).toBe(false);
    expect(state.cashoutSuccess).toBeTruthy();
    expect(state.wallet.balance).toBe(4000);
  });

  it('saveBankDetails success sets bankDetailsSuccess=true', async () => {
    walletApi.updateBankDetails.mockResolvedValue({ ok: true });

    const store = makeStore();
    await store.dispatch(saveBankDetails({ accountNumber: '123', ifsc: 'HDFC001' }));

    expect(store.getState().wallet.bankDetailsSuccess).toBe(true);
  });

  it('clearCashoutState resets cashoutError and cashoutSuccess', () => {
    const store = makeStore({
      wallet: {
        wallet: null,
        bankDetails: null,
        transactions: [],
        transactionsMeta: {},
        cashouts: [],
        cashoutsMeta: {},
        loading: false,
        txLoading: false,
        cashoutLoading: false,
        cashoutSubmitting: false,
        bankDetailsLoading: false,
        error: null,
        cashoutError: 'some-error',
        cashoutSuccess: { ok: true },
        bankDetailsSuccess: false,
      },
    });

    store.dispatch(clearCashoutState());

    const state = store.getState().wallet;
    expect(state.cashoutError).toBeNull();
    expect(state.cashoutSuccess).toBeNull();
  });

  it('clearBankDetailsSuccess sets bankDetailsSuccess back to false', () => {
    const store = makeStore({
      wallet: {
        wallet: null,
        bankDetails: null,
        transactions: [],
        transactionsMeta: {},
        cashouts: [],
        cashoutsMeta: {},
        loading: false,
        txLoading: false,
        cashoutLoading: false,
        cashoutSubmitting: false,
        bankDetailsLoading: false,
        error: null,
        cashoutError: null,
        cashoutSuccess: null,
        bankDetailsSuccess: true,
      },
    });

    store.dispatch(clearBankDetailsSuccess());

    expect(store.getState().wallet.bankDetailsSuccess).toBe(false);
  });

  it('fetchCashoutHistory success populates cashouts and meta', async () => {
    walletApi.getCashoutHistory.mockResolvedValue({
      items: [{ id: 'c1', requested_amount: 2000 }],
      total: 1,
      page: 1,
      pages: 1,
    });

    const store = makeStore();
    await store.dispatch(fetchCashoutHistory({ page: 1 }));

    const state = store.getState().wallet;
    expect(state.cashouts).toHaveLength(1);
    expect(state.cashoutsMeta).toEqual({ total: 1, page: 1, pages: 1 });
    expect(state.cashoutLoading).toBe(false);
  });
});
