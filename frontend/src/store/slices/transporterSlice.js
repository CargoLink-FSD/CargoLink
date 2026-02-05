// Transporter Profile Redux Slice
// Manages transporter profile state and actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as transporterApi from '../../api/transporter';

// Async thunks for transporter profile operations
export const fetchTransporterProfile = createAsyncThunk(
  'transporter/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data = await transporterApi.getTransporterProfile();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch profile');
    }
  }
);

export const updateTransporterField = createAsyncThunk(
  'transporter/updateField',
  async ({ fieldType, fieldValue }, { rejectWithValue }) => {
    try {
      await transporterApi.updateTransporterProfile(fieldType, fieldValue);
      return { fieldType, fieldValue };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

export const updateTransporterPassword = createAsyncThunk(
  'transporter/updatePassword',
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await transporterApi.updateTransporterPassword(oldPassword, newPassword);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update password');
    }
  }
);

export const fetchTransporterRatings = createAsyncThunk(
  'transporter/fetchRatings',
  async (_, { rejectWithValue }) => {
    try {
      const data = await transporterApi.getTransporterRatings();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch ratings');
    }
  }
);

// Initial state - added dedicated ratings fields
const initialState = {
  profile: null,
  loading: false,
  error: null,
  updateSuccess: false,

  // Dedicated ratings state (this helps prevent permanent loading state)
  ratings: null,           // will hold { averageRating, totalReviews, reviews, ... }
  ratingsLoading: false,
  ratingsError: null,
};

// Slice
const transporterSlice = createSlice({
  name: 'transporter',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },
    resetTransporterState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch transporter profile
      .addCase(fetchTransporterProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransporterProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchTransporterProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update transporter field
      .addCase(updateTransporterField.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateTransporterField.fulfilled, (state, action) => {
        state.loading = false;
        const { fieldType, fieldValue } = action.payload;
        if (state.profile) {
          state.profile[fieldType] = fieldValue;
        }
        state.updateSuccess = true;
      })
      .addCase(updateTransporterField.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Update password
      .addCase(updateTransporterPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateTransporterPassword.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateTransporterPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Ratings handling ───────────────────────────────────────────────
      .addCase(fetchTransporterRatings.pending, (state) => {
        state.ratingsLoading = true;
        state.ratingsError = null;
      })
      .addCase(fetchTransporterRatings.fulfilled, (state, action) => {
        state.ratingsLoading = false;
        state.ratings = action.payload;  // expected shape: { averageRating, totalReviews, reviews }
      })
      .addCase(fetchTransporterRatings.rejected, (state, action) => {
        state.ratingsLoading = false;
        state.ratingsError = action.payload;
      });
  },
});

export const { clearError, clearUpdateSuccess, resetTransporterState } = transporterSlice.actions;
export default transporterSlice.reducer;