// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

// Configure and export the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

export default store;
