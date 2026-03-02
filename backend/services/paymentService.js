import crypto from 'crypto';
import orderModel from "../models/order.js";
import Review from "../models/review.js";
import paymentRepo from "../repositories/paymentRepo.js";
import razorpay from "../config/razorpay.js";
import { AppError } from "../utils/misc.js";

export default {

  /**
   * Create a Razorpay order for final payment (no advance)
   */
  createPaymentOrder: async (orderId, customerId) => {
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, 'NotFound', 'Order not found', 'ERR_NOT_FOUND');
    }

    // Verify ownership
    if (order.customer_id.toString() !== customerId) {
      throw new AppError(403, 'Forbidden', 'Not your order', 'ERR_FORBIDDEN');
    }

    // Must have a transporter assigned
    if (!order.assigned_transporter_id) {
      throw new AppError(400, 'InvalidOperation', 'Cannot pay before a transporter is assigned', 'ERR_INVALID_OPERATION');
    }

    // Check if payment already completed
    const existingPayment = await paymentRepo.findByOrderAndType(orderId, 'final');
    if ((existingPayment && existingPayment.status === 'Completed') || order.payment_status === 'Paid') {
      throw new AppError(400, 'InvalidOperation', 'Payment already completed for this order', 'ERR_INVALID_OPERATION');
    }

    const amount = order.final_price || order.max_price;

    // Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `order_${orderId}_final`,
      notes: {
        order_id: orderId,
        payment_type: 'final',
        customer_id: customerId,
      },
    });

    // Save payment record
    const payment = await paymentRepo.createPayment({
      order_id: orderId,
      customer_id: customerId,
      amount,
      payment_type: 'final',
      razorpay_order_id: razorpayOrder.id,
      status: 'Created',
    });

    return {
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
      amount: amount,
      currency: 'INR',
      payment_id: payment._id,
    };
  },

  /**
   * Verify Razorpay payment signature & update records
   */
  verifyPayment: async (orderId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    // 1. Verify signature using HMAC SHA256
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      await paymentRepo.updatePaymentAfterVerification(razorpay_order_id, {
        status: 'Failed',
      });
      throw new AppError(400, 'PaymentError', 'Payment verification failed — invalid signature', 'ERR_PAYMENT_FAILED');
    }

    // 2. Update payment record
    const payment = await paymentRepo.updatePaymentAfterVerification(razorpay_order_id, {
      razorpay_payment_id,
      razorpay_signature,
      status: 'Completed',
    });

    if (!payment) {
      throw new AppError(404, 'NotFound', 'Payment record not found', 'ERR_NOT_FOUND');
    }

    // 3. Update order payment_status and mark as Completed
    const order = await orderModel.findById(orderId);
    order.payment_status = 'Paid';
    order.status = 'Completed';
    await order.save();

    return {
      payment_id: payment._id,
      status: payment.status,
      payment_type: payment.payment_type,
      order_payment_status: order.payment_status,
    };
  },

  /**
   * Add a review for a completed order
   */
  addReview: async (orderId, customerId, reviewData) => {
    const order = await orderModel.findById(orderId);

    if (!order || order.status !== "Completed") {
      throw new AppError(400, 'InvalidOperation', 'You can only review completed orders', 'ERR_INVALID_OPERATION');
    }

    if (order.is_reviewed) {
      throw new AppError(400, 'InvalidOperation', 'You have already submitted a review for this order', 'ERR_INVALID_OPERATION');
    }

    if (!order.assigned_transporter_id) {
      throw new AppError(400, 'InvalidOperation', 'No transporter assigned to this order', 'ERR_INVALID_OPERATION');
    }

    const review = await Review.create({
      order_id: orderId,
      customer_id: customerId,
      transporter_id: order.assigned_transporter_id,
      rating: reviewData.rating,
      comment: reviewData.comment,
    });

    order.is_reviewed = true;
    await order.save();

    return review;
  },

  /**
   * Payment history
   */
  getHistory: async (userId, role) => {
    return await paymentRepo.getPaymentHistory(userId, role);
  },

  /**
   * Get payment details for an order
   */
  getOrderPayments: async (orderId) => {
    return await paymentRepo.findByOrderId(orderId);
  },
};