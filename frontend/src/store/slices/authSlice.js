
//Auth Redux Slice
//Manages authentication state and actions
 

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from '../../api/auth';
import tokenStorage from '../../utils/token';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password, role }, { rejectWithValue }) => {
    try {
      const response = await authApi.login({ email, password, role });
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signup',
  async ({ signupData, userType }, { rejectWithValue }) => {
    try {
      const response = await authApi.signup({ signupData, userType });
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Signup failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
      return null;
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.refreshToken();
      return response;
    } catch (error) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

// Initial state
const initialState = {
  user: tokenStorage.getUserFromToken(),
  isAuthenticated: !!tokenStorage.getAccessToken() && !tokenStorage.isTokenExpired(tokenStorage.getAccessToken()),
  loading: false,
  error: null,
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    restoreSession: (state) => {
      const user = tokenStorage.getUserFromToken();
      const accessToken = tokenStorage.getAccessToken();
      if (user && accessToken && !tokenStorage.isTokenExpired(accessToken)) {
        state.user = user;
        state.isAuthenticated = true;
      } else {
        state.user = null;
        state.isAuthenticated = false;
        tokenStorage.clearTokens();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        tokenStorage.setTokens(action.payload.accessToken, action.payload.refreshToken);
        state.user = tokenStorage.getUserFromToken();
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
        tokenStorage.clearTokens();
      })
      
      // Signup
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        tokenStorage.setTokens(action.payload.accessToken, action.payload.refreshToken);
        state.user = tokenStorage.getUserFromToken();
        state.error = null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = action.payload;
        tokenStorage.clearTokens();
      })
      
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
        tokenStorage.clearTokens();
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
        tokenStorage.clearTokens();
      })
      
      // Refresh Token
      .addCase(refreshAccessToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.loading = false;
        tokenStorage.setTokens(action.payload.accessToken, action.payload.refreshToken);
        state.user = tokenStorage.getUserFromToken();
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        tokenStorage.clearTokens();
      });
  },
});

export const { clearError, restoreSession } = authSlice.actions;
export default authSlice.reducer;
