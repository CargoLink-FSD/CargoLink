import paymentService from "../services/paymentService.js";
import { AppError } from "../utils/misc.js";

const initiatePayment = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const result = await paymentService.createPaymentOrder(orderId, req.user.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

const initiateCancellationDuesPayment = async (req, res, next) => {
    try {
        const result = await paymentService.createCancellationDuesPaymentOrder(req.user.id);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

const verifyPayment = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new AppError(400, "ValidationError", "Missing Razorpay payment details", "ERR_VALIDATION");
        }

        const result = await paymentService.verifyPayment(orderId, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        res.status(200).json({ success: true, message: "Payment verified successfully", data: result });
    } catch (error) {
        next(error);
    }
};

const verifyCancellationDuesPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new AppError(400, "ValidationError", "Missing Razorpay payment details", "ERR_VALIDATION");
        }

        const result = await paymentService.verifyCancellationDuesPayment(req.user.id, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        res.status(200).json({ success: true, message: "Cancellation dues payment verified successfully", data: result });
    } catch (error) {
        next(error);
    }
};

const submitReview = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { rating, comment } = req.body;

        const review = await paymentService.addReview(orderId, req.user.id, { rating, comment });
        res.status(201).json({ success: true, message: "Review submitted", data: review });
    } catch (error) {
        next(error);
    }
};

const getOrderReview = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const review = await paymentService.getOrderReview(orderId, req.user.id, req.user.role);
        res.status(200).json({ success: true, data: review });
    } catch (error) {
        next(error);
    }
};

const getPaymentHistory = async (req, res, next) => {
    try {
        const history = await paymentService.getHistory(req.user.id, req.user.role);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        next(error);
    }
};

const requestPayout = async (req, res, next) => {
    res.status(501).json({ message: "Payout processing will be integrated with Razorpay Route" });
};

const downloadInvoice = async (req, res, next) => {
    res.status(501).json({ message: "Invoice generation service pending" });
};

export default {
    initiatePayment,
    initiateCancellationDuesPayment,
    verifyPayment,
    verifyCancellationDuesPayment,
    submitReview,
    getOrderReview,
    requestPayout,
    getPaymentHistory,
    downloadInvoice,
};
