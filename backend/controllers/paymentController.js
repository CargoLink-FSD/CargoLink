import paymentService from "../services/paymentService.js";
import { AppError } from "../utils/misc.js";
import {
    acquireDistributedLock,
    getCachedJson,
    releaseDistributedLock,
    setCachedJson,
} from "../core/cache.js";
import {
    buildIdempotencyCacheKey,
    getRequestIdempotencyKey,
} from "../utils/idempotency.js";

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
    let lockToken = null;
    let lockKey = null;

    try {
        const { orderId } = req.params;
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new AppError(400, "ValidationError", "Missing Razorpay payment details", "ERR_VALIDATION");
        }

        const requestIdempotencyKey = getRequestIdempotencyKey(req);
        const fallbackIdempotencyKey = `${razorpay_order_id}:${razorpay_payment_id}`;
        const idempotencyCacheKey = buildIdempotencyCacheKey({
            scope: 'payments:verify-order',
            payload: { orderId, customerId: req.user.id },
            requestKey: requestIdempotencyKey,
            fallbackKey: fallbackIdempotencyKey,
        });

        if (idempotencyCacheKey) {
            const cached = await getCachedJson(idempotencyCacheKey);
            if (cached) {
                res.setHeader('X-Idempotency-Status', 'REPLAY');
                return res.status(cached.statusCode || 200).json(cached.payload);
            }
        }

        lockKey = `lock:payments:verify:${razorpay_order_id}`;
        const lock = await acquireDistributedLock(lockKey, { ttlSeconds: 20 });
        if (!lock.acquired) {
            throw new AppError(
                409,
                "ConflictError",
                "Payment verification is already in progress for this Razorpay order.",
                "ERR_PAYMENT_VERIFY_IN_PROGRESS"
            );
        }
        lockToken = lock.token;

        const result = await paymentService.verifyPayment(orderId, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        const payload = { success: true, message: "Payment verified successfully", data: result };

        if (idempotencyCacheKey) {
            await setCachedJson(idempotencyCacheKey, {
                statusCode: 200,
                payload,
            }, 60 * 60 * 24);
        }

        res.status(200).json(payload);
    } catch (error) {
        next(error);
    } finally {
        if (lockKey && lockToken) {
            await releaseDistributedLock(lockKey, lockToken);
        }
    }
};

const verifyCancellationDuesPayment = async (req, res, next) => {
    let lockToken = null;
    let lockKey = null;

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new AppError(400, "ValidationError", "Missing Razorpay payment details", "ERR_VALIDATION");
        }

        const requestIdempotencyKey = getRequestIdempotencyKey(req);
        const fallbackIdempotencyKey = `${razorpay_order_id}:${razorpay_payment_id}`;
        const idempotencyCacheKey = buildIdempotencyCacheKey({
            scope: 'payments:verify-dues',
            payload: { customerId: req.user.id },
            requestKey: requestIdempotencyKey,
            fallbackKey: fallbackIdempotencyKey,
        });

        if (idempotencyCacheKey) {
            const cached = await getCachedJson(idempotencyCacheKey);
            if (cached) {
                res.setHeader('X-Idempotency-Status', 'REPLAY');
                return res.status(cached.statusCode || 200).json(cached.payload);
            }
        }

        lockKey = `lock:payments:dues-verify:${razorpay_order_id}`;
        const lock = await acquireDistributedLock(lockKey, { ttlSeconds: 20 });
        if (!lock.acquired) {
            throw new AppError(
                409,
                "ConflictError",
                "Cancellation dues verification is already in progress for this Razorpay order.",
                "ERR_DUES_VERIFY_IN_PROGRESS"
            );
        }
        lockToken = lock.token;

        const result = await paymentService.verifyCancellationDuesPayment(req.user.id, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        });

        const payload = {
            success: true,
            message: "Cancellation dues payment verified successfully",
            data: result,
        };

        if (idempotencyCacheKey) {
            await setCachedJson(idempotencyCacheKey, {
                statusCode: 200,
                payload,
            }, 60 * 60 * 24);
        }

        res.status(200).json(payload);
    } catch (error) {
        next(error);
    } finally {
        if (lockKey && lockToken) {
            await releaseDistributedLock(lockKey, lockToken);
        }
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
