import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getAllCashouts } from '../../api/adminCashouts';

export const fetchAdminCashouts = createAsyncThunk(
  'adminCashouts/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await getAllCashouts(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cashouts');
    }
  }
);

const adminCashoutsSlice = createSlice({
  name: 'adminCashouts',
  initialState: {
    cashouts: [],
    stats: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    },
    loading: false,
    error: null,
  },
  reducers: {
    clearCashoutsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCashouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminCashouts.fulfilled, (state, action) => {
        state.loading = false;
        state.cashouts = action.payload.cashouts;
        state.stats = action.payload.stats;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchAdminCashouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCashoutsError } = adminCashoutsSlice.actions;
export default adminCashoutsSlice.reducer;
