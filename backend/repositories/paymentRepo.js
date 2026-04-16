import Payment from '../models/payment.js';


const createPayment = async (paymentData) => {
    const payment = new Payment(paymentData);
    await payment.save();
    return payment;
};

const findByOrderId = async (orderId) => {
    return await Payment.find({ order_id: orderId }).sort({ createdAt: -1 });
};

const findByOrderAndType = async (orderId, paymentType) => {
    return await Payment.findOne({ order_id: orderId, payment_type: paymentType });
};


const findByRazorpayOrderId = async (razorpayOrderId) => {
    return await Payment.findOne({ razorpay_order_id: razorpayOrderId });
};

const findPendingByCustomerAndType = async (customerId, paymentType) => {
    return await Payment.findOne({
        customer_id: customerId,
        payment_type: paymentType,
        status: { $in: ['Created', 'Pending'] },
    }).sort({ createdAt: -1 });
};

/**
 * Update payment status and Razorpay details after verification
 */
const updatePaymentAfterVerification = async (razorpayOrderId, updateData) => {
    return await Payment.findOneAndUpdate(
        { razorpay_order_id: razorpayOrderId },
        { $set: updateData },
        { new: true }
    );
};

/**
 * Get payment history for a user
 */
const getPaymentHistory = async (userId, role) => {
    const filter = role === 'customer'
        ? { customer_id: userId }
        : {};

    return await Payment.find(filter)
        .populate({
            path: 'order_id',
            select: 'pickup delivery status final_price goods_type assigned_transporter_id',
        })
        .sort({ createdAt: -1 });
};

export default {
    createPayment,
    findByOrderId,
    findByOrderAndType,
    findByRazorpayOrderId,
    findPendingByCustomerAndType,
    updatePaymentAfterVerification,
    getPaymentHistory,
};
