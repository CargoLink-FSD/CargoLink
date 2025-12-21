// src/store/slices/chatSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as chatApi from '../../api/chat';


// Async thunks
export const fetchChatMessages = createAsyncThunk(
  'chat/fetchMessages',
  async (orderId, { rejectWithValue }) => {
    try {
      const data = await chatApi.fetchChatHistory(orderId);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch chat messages');
    }
  }
);

export const sendChatMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ orderId, message}, { rejectWithValue }) => {
    try {      
      const data = await chatApi.postChatMessage(orderId, message);
      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to send chat message');
    }
  }
);

// Initial state
const initialState = {
  messages: [],
  loading: false,
  error: null,
  lastFetched: null
};

// Slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearChat: (state) => {
      state.messages = [];
      state.error = null;
      state.lastFetched = null;
    },
    clearChatError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch chat messages
      .addCase(fetchChatMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatMessages.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload.messages || [];
        state.lastFetched = Date.now();
      })
      .addCase(fetchChatMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Send chat message
      .addCase(sendChatMessage.pending, (state, action) => {
        state.error = null;
        const { message, userType } = action.meta.arg; // Removed unused `orderId`
        console.log({message, userType});
        
        const tempMessage = {
          id: `temp-${Date.now()}`, // Temporary ID
          senderType: userType, // Assuming the sender is the user
          senderId: 'temp-user', // Temporary user ID
          content: message,
          timestamp: new Date().toISOString(),
        };
        state.messages.push(tempMessage);
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.error = null;
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.error = action.payload;
        // Remove the temporary message
        state.messages = state.messages.filter(msg => !msg.id.startsWith('temp-'));
      });
  }
});

export const { clearChat, clearChatError } = chatSlice.actions;
export default chatSlice.reducer;