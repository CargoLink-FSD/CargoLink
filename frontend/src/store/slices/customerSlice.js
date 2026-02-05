// Customer Profile Redux Slice
// Manages customer profile state and actions

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as customerApi from '../../api/customer';

// Async thunks for customer profile operations
export const fetchCustomerProfile = createAsyncThunk(
  'customer/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const data = await customerApi.getCustomerProfile();
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch profile');
    }
  }
);

export const updateCustomerField = createAsyncThunk(
  'customer/updateField',
  async ({ fieldType, fieldValue }, { rejectWithValue }) => {
    try {
      await customerApi.updateCustomerProfile(fieldType, fieldValue);
      return { fieldType, fieldValue };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update profile');
    }
  }
);

export const updateCustomerPassword = createAsyncThunk(
  'customer/updatePassword',
  async ({ oldPassword, newPassword }, { rejectWithValue }) => {
    try {
      const response = await customerApi.updateCustomerPassword(oldPassword, newPassword);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update password');
    }
  }
);

export const addCustomerAddress = createAsyncThunk(
  'customer/addAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const response = await customerApi.addCustomerAddress(addressData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add address');
    }
  }
);

export const deleteCustomerAddress = createAsyncThunk(
  'customer/deleteAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const response = await customerApi.deleteCustomerAddress(addressId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete address');
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
const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },
    resetCustomerState: (state) => {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customer profile
      .addCase(fetchCustomerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerProfile.fulfilled, (state, action) => {
        state.loading = false;
        // Backend returns { data: { ...profile } }
        const profileData = action.payload.data || action.payload;
        state.profile = profileData;
        state.addresses = profileData?.addresses || [];
      })
      .addCase(fetchCustomerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update customer field
      .addCase(updateCustomerField.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateCustomerField.fulfilled, (state, action) => {
        state.loading = false;
        const { fieldType, fieldValue } = action.payload;
        if (state.profile) {
          state.profile[fieldType] = fieldValue;
        }
        state.updateSuccess = true;
      })
      .addCase(updateCustomerField.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update password
      .addCase(updateCustomerPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateCustomerPassword.fulfilled, (state) => {
        state.loading = false;
        state.updateSuccess = true;
      })
      .addCase(updateCustomerPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Add address
      .addCase(addCustomerAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCustomerAddress.fulfilled, (state, action) => {
        state.loading = false;
        // API returns response.data which is { _id, addresses: [...] }
        const newAddresses = action.payload.addresses || action.payload;
        state.addresses = Array.isArray(newAddresses) ? newAddresses : [];
        if (state.profile) {
          state.profile.addresses = state.addresses;
        }
        state.updateSuccess = true;
      })
      .addCase(addCustomerAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Delete address
      .addCase(deleteCustomerAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomerAddress.fulfilled, (state, action) => {
        state.loading = false;
        // API returns response.data which is the addresses array directly
        const newAddresses = action.payload;
        // Ensure it's an array
        state.addresses = Array.isArray(newAddresses) ? newAddresses : [];
        if (state.profile) {
          state.profile.addresses = state.addresses;
        }
        state.updateSuccess = true;
      })
      .addCase(deleteCustomerAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearUpdateSuccess, resetCustomerState } = customerSlice.actions;
export default customerSlice.reducer;
