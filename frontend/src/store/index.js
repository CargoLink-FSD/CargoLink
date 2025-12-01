// Redux Store Configuration

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import customerReducer from './slices/customerSlice';
import transporterReducer from './slices/transporterSlice';

// Configure and export the Redux store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    customer: customerReducer,
    transporter: transporterReducer,
  },
});

export default store;
