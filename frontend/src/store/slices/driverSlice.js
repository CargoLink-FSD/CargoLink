// Driver Profile Redux Slice
// Manages driver profile state and actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/driver';

// Async thunks for driver profile operations
export const fetchDriverProfile = createAsyncThunk(
  'driver/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.getDriverProfile();
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateDriverField = createAsyncThunk(
  'driver/updateField',
  async ({ fieldKey, fieldValue }, { rejectWithValue }) => {
    try {
      const response = await api.updateDriverProfile({ [fieldKey]: fieldValue });
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateDriverPassword = createAsyncThunk(
  'driver/updatePassword',
  async (passwordData, { rejectWithValue }) => {
    try {
      const response = await api.updateDriverPassword(passwordData);
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const uploadDriverProfilePicture = createAsyncThunk(
  'driver/uploadProfilePicture',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const response = await api.uploadDriverProfilePicture(formData);
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

// Initial state
const initialState = {
  profile: null,
  addresses: [],
  loading: false,
  error: null,
  updateSuccess: false,
};

// Slice
const driverSlice = createSlice({
  name: 'driver',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
      .addCase(fetchDriverProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDriverProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchDriverProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to fetch profile';
      })
      // Update field
      .addCase(updateDriverField.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateDriverField.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = { ...state.profile, ...action.payload };
        state.updateSuccess = true;
      })
      .addCase(updateDriverField.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update field';
      })
      // Update password
      .addCase(updateDriverPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateDriverPassword.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateDriverPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to update password';
      })
      // Upload profile picture
      .addCase(uploadDriverProfilePicture.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDriverProfilePicture.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = { ...state.profile, profileImage: action.payload.profileImage };
        state.updateSuccess = true;
      })
      .addCase(uploadDriverProfilePicture.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Failed to upload profile picture';
      });
  },
});

export const { clearError, clearUpdateSuccess } = driverSlice.actions;
export default driverSlice.reducer;
