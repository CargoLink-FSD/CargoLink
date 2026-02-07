import orderModel from "../models/order.js";
import Payment from "../models/payment.js";
import Review from "../models/review.js";

export default {

  /** ============================
   *  CONFIRM PAYMENT
   *  ============================ */
  confirmPayment: async (orderId, details) => {
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Ensure transporter is assigned
    if (!order.assigned_transporter_id) {
      throw new Error("Cannot pay for an order without an assigned transporter");
    }

    // Prevent duplicate payments
    const existingPayment = await Payment.findOne({ order_id: orderId });
    if (existingPayment) {
      throw new Error("Payment already completed for this order");
    }

    const payment = await Payment.create({
      order_id: orderId,
      customer_id: details.customerId,
      amount: order.final_price ?? order.max_price,
      transaction_id: details.transactionId,
      method: details.method,
      status: "Completed"
    });

    // Move order to Assigned so transporter can start
    order.status = "Assigned";
    await order.save();

    return payment;
  },

  /** ============================
   *  ADD REVIEW
   *  ============================ */
  addReview: async (orderId, customerId, reviewData) => {
    const order = await orderModel.findById(orderId);

    // Order must exist AND be completed
    if (!order || order.status !== "Completed") {
      throw new Error("You can only review completed orders");
    }

    // Prevent duplicate reviews
    if (order.is_reviewed) {
      throw new Error("You have already submitted a review for this order");
    }

    if (!order.assigned_transporter_id) {
      throw new Error("No transporter assigned to this order");
    }

    const review = await Review.create({
      order_id: orderId,
      customer_id: customerId,
      transporter_id: order.assigned_transporter_id,
      rating: reviewData.rating,
      comment: reviewData.comment
    });

    // 6. Persistence: Mark the order as reviewed and SAVE to database
    order.is_reviewed = true;
    await order.save();

    return review;
  },

  /** ============================
   *  PAYMENT HISTORY
   *  ============================ */
  getHistory: async (userId, role) => {
    const filter =
      role === "customer"
        ? { customer_id: userId }
        : { transporter_id: userId };

    return await Payment.find(filter)
      .populate("order_id")
      .sort({ createdAt: -1 });
  }
};