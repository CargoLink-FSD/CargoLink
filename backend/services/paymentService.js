import orderModel from "../models/order.js";
import Payment from "../models/payment.js"; 
import Review from "../models/review.js";   

export default {
  // Existing payment methods...

  addReview: async (orderId, customerId, reviewData) => {
    // 1. Fetch the specific order
    const order = await orderModel.findById(orderId);
    
    // 2. Security Check: Ensure order exists and is Completed
    if (!order || order.status !== "Completed") {
      throw new Error("You can only review completed orders");
    }

    // 3. Prevent Duplicates: Check the flag on the order
    if (order.is_reviewed) {
      throw new Error("You have already submitted a review for this order");
    }

    // 4. Data Validation: Ensure there is a transporter to rate
    if (!order.assigned_transporter_id) {
      throw new Error("No transporter assigned to this order");
    }

    // 5. Create the Review record
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

  getHistory: async (userId, role) => {
    const filter = role === "customer" ? { customer_id: userId } : { transporter_id: userId };
    return await Payment.find(filter).populate("order_id").sort({ createdAt: -1 });
  }
};