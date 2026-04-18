import crypto from 'crypto';
import orderModel from "../models/order.js";
import Review from "../models/review.js";
import paymentRepo from "../repositories/paymentRepo.js";
import razorpay from "../config/razorpay.js";
import { AppError } from "../utils/misc.js";
import { getCustomerDuesSummary, settleCustomerDues } from "./cancellationPolicyService.js";
import { DOMAIN_EVENTS, emitDomainEvent } from '../utils/eventEmitter.js';

const assertRazorpaySigningConfigured = () => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new AppError(500, 'ConfigError', 'Razorpay signing secret is missing', 'ERR_RAZORPAY_CONFIG');
  }
};

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
   * Create Razorpay order to settle customer cancellation dues.
   */
  createCancellationDuesPaymentOrder: async (customerId) => {
    const dues = await getCustomerDuesSummary(customerId);
    const amount = Number(dues.outstandingCancellationDues || 0);

    if (amount <= 0) {
      throw new AppError(400, 'InvalidOperation', 'No pending cancellation dues to settle', 'ERR_NO_DUES');
    }

    const existing = await paymentRepo.findPendingByCustomerAndType(customerId, 'cancellation_due');
    if (existing) {
      return {
        razorpay_order_id: existing.razorpay_order_id,
        razorpay_key_id: process.env.RAZORPAY_KEY_ID,
        amount: existing.amount,
        currency: 'INR',
        payment_id: existing._id,
      };
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `dues_${String(customerId).slice(-8)}_${Date.now()}`,
      notes: {
        payment_type: 'cancellation_due',
        customer_id: customerId,
      },
    });

    const payment = await paymentRepo.createPayment({
      order_id: null,
      customer_id: customerId,
      amount,
      payment_type: 'cancellation_due',
      razorpay_order_id: razorpayOrder.id,
      status: 'Created',
    });

    return {
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: process.env.RAZORPAY_KEY_ID,
      amount,
      currency: 'INR',
      payment_id: payment._id,
    };
  },

  /**
   * Verify Razorpay payment signature & update records
   */
  verifyPayment: async (orderId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    assertRazorpaySigningConfigured();

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

    // 3. Update order payment_status + status
    // NOTE: Frontend treats "Pay Now" as delivery completion, so once final payment
    // is verified we mark the order as Completed as well (unless cancelled).
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, 'NotFound', 'Order not found', 'ERR_NOT_FOUND');
    }

    order.payment_status = 'Paid';
    if (order.status !== 'Cancelled' && order.status !== 'Completed') {
      order.status = 'Completed';
    }
    await order.save();

    const recipients = [{ userId: order.customer_id?.toString(), role: 'customer' }];
    if (order.assigned_transporter_id) {
      recipients.push({ userId: order.assigned_transporter_id.toString(), role: 'transporter' });
    }

    emitDomainEvent(DOMAIN_EVENTS.PAYMENT_COMPLETED, {
      type: 'payment.completed',
      title: 'Payment completed',
      message: `Payment was completed for order ${orderId}`,
      recipients,
      actor: { userId: order.customer_id?.toString(), role: 'customer' },
      meta: {
        orderId: order._id.toString(),
        paymentId: payment._id.toString(),
        amount: payment.amount,
      },
    });

    return {
      payment_id: payment._id,
      status: payment.status,
      payment_type: payment.payment_type,
      order_payment_status: order.payment_status,
      order_status: order.status,
    };
  },

  /**
   * Verify cancellation dues payment and settle dues ledger.
   */
  verifyCancellationDuesPayment: async (customerId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
    assertRazorpaySigningConfigured();

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const payment = await paymentRepo.findByRazorpayOrderId(razorpay_order_id);
    if (!payment || payment.payment_type !== 'cancellation_due') {
      throw new AppError(404, 'NotFound', 'Cancellation dues payment record not found', 'ERR_NOT_FOUND');
    }

    if (payment.customer_id.toString() !== customerId) {
      throw new AppError(403, 'Forbidden', 'Not your payment', 'ERR_FORBIDDEN');
    }

    if (generatedSignature !== razorpay_signature) {
      await paymentRepo.updatePaymentAfterVerification(razorpay_order_id, {
        status: 'Failed',
      });
      throw new AppError(400, 'PaymentError', 'Payment verification failed — invalid signature', 'ERR_PAYMENT_FAILED');
    }

    const updatedPayment = await paymentRepo.updatePaymentAfterVerification(razorpay_order_id, {
      razorpay_payment_id,
      razorpay_signature,
      status: 'Completed',
      payment_type: 'cancellation_due',
    });

    const settlement = await settleCustomerDues(customerId, updatedPayment.amount);

    emitDomainEvent(DOMAIN_EVENTS.CANCELLATION_DUES_PAID, {
      type: 'payment.cancellation_dues.paid',
      title: 'Cancellation dues settled',
      message: 'Your pending cancellation dues payment was completed successfully.',
      recipients: [{ userId: customerId, role: 'customer' }],
      actor: { userId: customerId, role: 'customer' },
      meta: {
        paymentId: updatedPayment._id.toString(),
        amount: updatedPayment.amount,
      },
    });

    return {
      payment_id: updatedPayment._id,
      status: updatedPayment.status,
      payment_type: updatedPayment.payment_type,
      dues: settlement,
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

    if (order.payment_status !== 'Paid') {
      throw new AppError(400, 'InvalidOperation', 'Please complete the final payment before submitting a review', 'ERR_INVALID_OPERATION');
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

    emitDomainEvent(DOMAIN_EVENTS.ORDER_REVIEW_SUBMITTED, {
      type: 'order.review.submitted',
      title: 'New order review',
      message: `A customer submitted a review for order ${orderId}`,
      recipients: [{ userId: order.assigned_transporter_id.toString(), role: 'transporter' }],
      actor: { userId: customerId, role: 'customer' },
      meta: {
        orderId,
        reviewId: review._id.toString(),
        rating: review.rating,
      },
    });

    return review;
  },

  /**
   * Get review for an order (for Order Details)
   */
  getOrderReview: async (orderId, userId, role) => {
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, 'NotFound', 'Order not found', 'ERR_NOT_FOUND');
    }

    if (role === 'customer' && order.customer_id.toString() !== userId) {
      throw new AppError(403, 'Forbidden', 'Not your order', 'ERR_FORBIDDEN');
    }
    if (role === 'transporter' && order.assigned_transporter_id?.toString() !== userId) {
      throw new AppError(403, 'Forbidden', 'Not authorized for this order', 'ERR_FORBIDDEN');
    }

    const review = await Review.findOne({ order_id: orderId });
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