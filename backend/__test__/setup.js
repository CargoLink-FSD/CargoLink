import { jest } from '@jest/globals';
import * as misc from '../utils/misc.js';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens';
process.env.PORT = 5001;
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret';



// Global test timeout
jest.setTimeout(30000);



// Replace logger methods globally
misc.logger.debug = jest.fn();
misc.logger.info = jest.fn();
misc.logger.warn = jest.fn();
misc.logger.error = jest.fn();


// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// // Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});



