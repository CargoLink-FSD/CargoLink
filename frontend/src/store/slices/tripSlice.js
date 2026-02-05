// Trip Redux Slice
// Manages trip state and actions for transporter's trip-centric operations

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as tripApi from '../../api/trips';


export const fetchTrips = createAsyncThunk(
  'trips/fetchTrips',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const trips = await tripApi.getTrips(filters);
      return trips;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch trips');
    }
  }
);

/**
 * Fetch single trip details
 */
export const fetchTripDetails = createAsyncThunk(
  'trips/fetchTripDetails',
  async (tripId, { rejectWithValue }) => {
    try {
      const trip = await tripApi.getTripDetails(tripId);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch trip details');
    }
  }
);

/**
 * Create new trip (Planned status)
 */
export const createTrip = createAsyncThunk(
  'trips/createTrip',
  async (tripData, { rejectWithValue }) => {
    try {
      const trip = await tripApi.createTrip(tripData);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create trip');
    }
  }
);

/**
 * Delete trip (only Planned status)
 */
export const deleteTrip = createAsyncThunk(
  'trips/deleteTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      await tripApi.deleteTrip(tripId);
      return tripId;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete trip');
    }
  }
);

/**
 * Assign vehicle to trip
 */
export const assignVehicleToTrip = createAsyncThunk(
  'trips/assignVehicle',
  async ({ tripId, vehicleId }, { rejectWithValue }) => {
    try {
      const trip = await tripApi.assignVehicle(tripId, vehicleId);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to assign vehicle');
    }
  }
);

/**
 * Add orders to trip
 */
export const addOrdersToTrip = createAsyncThunk(
  'trips/addOrders',
  async ({ tripId, orderIds }, { rejectWithValue }) => {
    try {
      const trip = await tripApi.addOrders(tripId, orderIds);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to add orders');
    }
  }
);

/**
 * Schedule trip (generate stops with OTPs)
 */
export const scheduleTrip = createAsyncThunk(
  'trips/scheduleTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      const trip = await tripApi.scheduleTrip(tripId);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to schedule trip');
    }
  }
);

/**
 * Start trip (set InTransit status)
 */
export const startTrip = createAsyncThunk(
  'trips/startTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      const trip = await tripApi.startTrip(tripId);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to start trip');
    }
  }
);

/**
 * Mark arrival at stop
 */
export const arriveAtStop = createAsyncThunk(
  'trips/arriveAtStop',
  async ({ tripId, seq }, { rejectWithValue }) => {
    try {
      const trip = await tripApi.arriveAtStop(tripId, seq);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to mark arrival');
    }
  }
);

/**
 * Confirm pickup with OTP
 */
export const confirmPickup = createAsyncThunk(
  'trips/confirmPickup',
  async ({ tripId, seq, otp }, { rejectWithValue }) => {
    try {
      const trip = await tripApi.confirmPickup(tripId, seq, otp);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to confirm pickup');
    }
  }
);

/**
 * Confirm dropoff
 */
export const confirmDropoff = createAsyncThunk(
  'trips/confirmDropoff',
  async ({ tripId, seq }, { rejectWithValue }) => {
    try {
      const trip = await tripApi.confirmDropoff(tripId, seq);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to confirm dropoff');
    }
  }
);

/**
 * Complete trip (free vehicle)
 */
export const completeTrip = createAsyncThunk(
  'trips/completeTrip',
  async (tripId, { rejectWithValue }) => {
    try {
      const trip = await tripApi.completeTrip(tripId);
      return trip;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to complete trip');
    }
  }
);


// SLICE


const initialState = {
  trips: [],
  activeTrip: null, // Currently selected/executing trip
  loading: false,
  error: null,
  
  // Builder state
  builderTrip: null, // Trip being built (Planned status)
  builderLoading: false,
  builderError: null,
};

const tripSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    // Clear active trip
    clearActiveTrip: (state) => {
      state.activeTrip = null;
    },
    
    // Clear builder trip
    clearBuilderTrip: (state) => {
      state.builderTrip = null;
      state.builderError = null;
    },
    
    // Set active trip (for execution dashboard)
    setActiveTrip: (state, action) => {
      state.activeTrip = action.payload;
    },
    
    // Clear errors
    clearErrors: (state) => {
      state.error = null;
      state.builderError = null;
    },
  },
  extraReducers: (builder) => {
    
    // FETCH TRIPS
    
    builder
      .addCase(fetchTrips.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTrips.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = action.payload;
      })
      .addCase(fetchTrips.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // FETCH TRIP DETAILS
    
    builder
      .addCase(fetchTripDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTripDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
      })
      .addCase(fetchTripDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // CREATE TRIP
    
    builder
      .addCase(createTrip.pending, (state) => {
        state.builderLoading = true;
        state.builderError = null;
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.builderLoading = false;
        state.builderTrip = action.payload;
        state.trips.unshift(action.payload); // Add to list
      })
      .addCase(createTrip.rejected, (state, action) => {
        state.builderLoading = false;
        state.builderError = action.payload;
      });

    
    // DELETE TRIP
    
    builder
      .addCase(deleteTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.trips = state.trips.filter(trip => trip._id !== action.payload);
        if (state.builderTrip?._id === action.payload) {
          state.builderTrip = null;
        }
        if (state.activeTrip?._id === action.payload) {
          state.activeTrip = null;
        }
      })
      .addCase(deleteTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // ASSIGN VEHICLE
    
    builder
      .addCase(assignVehicleToTrip.pending, (state) => {
        state.builderLoading = true;
        state.builderError = null;
      })
      .addCase(assignVehicleToTrip.fulfilled, (state, action) => {
        state.builderLoading = false;
        state.builderTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(assignVehicleToTrip.rejected, (state, action) => {
        state.builderLoading = false;
        state.builderError = action.payload;
      });

    
    // ADD ORDERS
    
    builder
      .addCase(addOrdersToTrip.pending, (state) => {
        state.builderLoading = true;
        state.builderError = null;
      })
      .addCase(addOrdersToTrip.fulfilled, (state, action) => {
        state.builderLoading = false;
        state.builderTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(addOrdersToTrip.rejected, (state, action) => {
        state.builderLoading = false;
        state.builderError = action.payload;
      });

    
    // SCHEDULE TRIP
    
    builder
      .addCase(scheduleTrip.pending, (state) => {
        state.builderLoading = true;
        state.builderError = null;
      })
      .addCase(scheduleTrip.fulfilled, (state, action) => {
        state.builderLoading = false;
        state.builderTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
        // Clear builder, move to active
        state.activeTrip = action.payload;
      })
      .addCase(scheduleTrip.rejected, (state, action) => {
        state.builderLoading = false;
        state.builderError = action.payload;
      });

    
    // START TRIP
    
    builder
      .addCase(startTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(startTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // ARRIVE AT STOP
    
    builder
      .addCase(arriveAtStop.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(arriveAtStop.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(arriveAtStop.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // CONFIRM PICKUP
    
    builder
      .addCase(confirmPickup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmPickup.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(confirmPickup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // CONFIRM DROPOFF
    
    builder
      .addCase(confirmDropoff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmDropoff.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(confirmDropoff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    
    // COMPLETE TRIP
    
    builder
      .addCase(completeTrip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeTrip.fulfilled, (state, action) => {
        state.loading = false;
        state.activeTrip = action.payload;
        // Update in trips list
        const index = state.trips.findIndex(t => t._id === action.payload._id);
        if (index !== -1) {
          state.trips[index] = action.payload;
        }
      })
      .addCase(completeTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});


// EXPORTS


export const {
  clearActiveTrip,
  clearBuilderTrip,
  setActiveTrip,
  clearErrors,
} = tripSlice.actions;

export default tripSlice.reducer;
