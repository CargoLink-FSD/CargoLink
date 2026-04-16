import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const hasCredentials = Boolean(keyId && keySecret);

const razorpay = hasCredentials
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : {
    orders: {
      create: async (payload) => {
        if (process.env.NODE_ENV === 'test') {
          return {
            id: `order_test_${Date.now()}`,
            amount: payload.amount,
            currency: payload.currency || 'INR',
            receipt: payload.receipt,
            notes: payload.notes || {},
          };
        }

        throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      },
    },
  };

export default razorpay;
