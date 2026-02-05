import paymentService from "../services/paymentService.js";

const initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    // req.user.id is provided by authMiddleware
    const paymentIntent = await paymentService.createPaymentIntent(orderId, req.user.id);
    res.status(200).json({ success: true, data: paymentIntent });
  } catch (error) {
    next(error);
  }
};

const processPayment = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { transactionId, method } = req.body;

    const result = await paymentService.confirmPayment(orderId, {
      transactionId,
      method,
      customerId: req.user.id
    });

    res.status(200).json({ success: true, message: "Payment successful", data: result });
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

const getPaymentHistory = async (req, res, next) => {
  try {
    const history = await paymentService.getHistory(req.user.id, req.user.role);
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

const requestPayout = async (req, res, next) => {
  res.status(501).json({ message: "Payout processing integrated with gateway" });
};

const downloadInvoice = async (req, res, next) => {
  res.status(501).json({ message: "Invoice generation service pending" });
};

export default {
  initiatePayment,
  processPayment,
  submitReview,
  requestPayout,
  getPaymentHistory,
  downloadInvoice
};