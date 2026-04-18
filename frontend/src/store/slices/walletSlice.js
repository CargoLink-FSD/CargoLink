import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as walletApi from '../../api/wallet';

export const fetchWallet = createAsyncThunk('wallet/fetchWallet', async (_, { rejectWithValue }) => {
  try { return await walletApi.getWallet(); }
  catch (e) { return rejectWithValue(e.message || 'Failed to load wallet'); }
});

export const fetchTransactions = createAsyncThunk('wallet/fetchTransactions', async (params, { rejectWithValue }) => {
  try { return await walletApi.getTransactions(params); }
  catch (e) { return rejectWithValue(e.message || 'Failed to load transactions'); }
});

export const fetchCashoutHistory = createAsyncThunk('wallet/fetchCashoutHistory', async (params, { rejectWithValue }) => {
  try { return await walletApi.getCashoutHistory(params); }
  catch (e) { return rejectWithValue(e.message || 'Failed to load cashout history'); }
});

export const submitCashoutRequest = createAsyncThunk('wallet/submitCashout', async (amount, { rejectWithValue }) => {
  try { return await walletApi.requestCashout(amount); }
  catch (e) { return rejectWithValue(e.message || 'Cashout request failed'); }
});

export const saveBankDetails = createAsyncThunk('wallet/saveBankDetails', async (details, { rejectWithValue }) => {
  try { return await walletApi.updateBankDetails(details); }
  catch (e) { return rejectWithValue(e.message || 'Failed to save bank details'); }
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
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
    bankDetailsSuccess: false,
  },
  reducers: {
    clearCashoutState: (state) => {
      state.cashoutError = null;
      state.cashoutSuccess = null;
    },
    clearBankDetailsSuccess: (state) => {
      state.bankDetailsSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchWallet.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.wallet = payload.wallet;
        state.bankDetails = payload.bankDetails;
      })
      .addCase(fetchWallet.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(fetchTransactions.pending, (state) => { state.txLoading = true; })
      .addCase(fetchTransactions.fulfilled, (state, { payload }) => {
        state.txLoading = false;
        state.transactions = payload.items || [];
        state.transactionsMeta = { total: payload.total, page: payload.page, pages: payload.pages };
      })
      .addCase(fetchTransactions.rejected, (state) => { state.txLoading = false; })

      .addCase(fetchCashoutHistory.pending, (state) => { state.cashoutLoading = true; })
      .addCase(fetchCashoutHistory.fulfilled, (state, { payload }) => {
        state.cashoutLoading = false;
        state.cashouts = payload.items || [];
        state.cashoutsMeta = { total: payload.total, page: payload.page, pages: payload.pages };
      })
      .addCase(fetchCashoutHistory.rejected, (state) => { state.cashoutLoading = false; })

      .addCase(submitCashoutRequest.pending, (state) => { state.cashoutSubmitting = true; state.cashoutError = null; state.cashoutSuccess = null; })
      .addCase(submitCashoutRequest.fulfilled, (state, { payload }) => {
        state.cashoutSubmitting = false;
        state.cashoutSuccess = payload;
        if (state.wallet && payload.data?.cashout?.requested_amount) {
          state.wallet.balance -= payload.data.cashout.requested_amount;
        }
      })
      .addCase(submitCashoutRequest.rejected, (state, { payload }) => {
        state.cashoutSubmitting = false;
        state.cashoutError = payload;
      })

      .addCase(saveBankDetails.pending, (state) => { state.bankDetailsLoading = true; state.bankDetailsSuccess = false; })
      .addCase(saveBankDetails.fulfilled, (state) => { state.bankDetailsLoading = false; state.bankDetailsSuccess = true; })
      .addCase(saveBankDetails.rejected, (state) => { state.bankDetailsLoading = false; });
  },
});

export const { clearCashoutState, clearBankDetailsSuccess } = walletSlice.actions;
export default walletSlice.reducer;
