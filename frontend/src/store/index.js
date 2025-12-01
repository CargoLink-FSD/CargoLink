// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import bidsReducer from './slices/bidsSlice';

// Configure and export the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    bids: bidsReducer,
  },
});

export default store;
