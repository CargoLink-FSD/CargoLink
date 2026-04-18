import orderService from "../services/orderService.js";
import pricingService from "../services/pricingService.js";
import mongoose from "mongoose";
import { logger, AppError } from "../utils/misc.js";
import { geocodeAddress } from "../utils/osrm.js";
import orderRepo from "../repositories/orderRepo.js";
import bidRepo from "../repositories/bidRepo.js";
import generateQuotePdf from "../utils/generateQuotePdf.js";
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


const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { search, status, page, limit } = req.query;

    const orders = await orderService.getOrdersByUser(userId, role, { search, status, page, limit });

    if (orders?.items) {
      return res.status(200).json({
        success: true,
        data: orders.items,
        pagination: orders.pagination,
        message: "Orders fetched successfully",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
      message: "Orders fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.id;
    const role = req.user.role;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const orderDetails = await orderService.getOrderDetails(orderId, userId, role);

    res.status(200).json({
      success: true,
      data: orderDetails,
      message: "Order details fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

const placeOrder = async (req, res, next) => {
  try {
    const orderData = req.body;
    orderData.customer_id = req.user.id;

    // Parse JSON strings from FormData (multer sends text fields as strings)
    if (typeof orderData.pickup === 'string') {
      try { orderData.pickup = JSON.parse(orderData.pickup); } catch (_) { }
    }
    if (typeof orderData.delivery === 'string') {
      try { orderData.delivery = JSON.parse(orderData.delivery); } catch (_) { }
    }
    if (typeof orderData.shipments === 'string') {
      try { orderData.shipments = JSON.parse(orderData.shipments); } catch (_) { }
    }

    // Geocode pickup if coordinates not provided
    if (orderData.pickup && !orderData.pickup.coordinates?.length) {
      const addr = [orderData.pickup.street, orderData.pickup.city, orderData.pickup.state, orderData.pickup.pin]
        .filter(Boolean).join(', ');
      const result = await geocodeAddress(addr);
      if (result) {
        orderData.pickup.coordinates = [result.lng, result.lat];
      }
    }

    // Geocode delivery if coordinates not provided
    if (orderData.delivery && !orderData.delivery.coordinates?.length) {
      const addr = [orderData.delivery.street, orderData.delivery.city, orderData.delivery.state, orderData.delivery.pin]
        .filter(Boolean).join(', ');
      const result = await geocodeAddress(addr);
      if (result) {
        orderData.delivery.coordinates = [result.lng, result.lat];
      }
    }

    // If a cargo photo was uploaded, add the path to orderData
    if (req.file) {
      orderData.cargo_photo = req.file.publicUrl || `/uploads/cargo-photos/${req.file.filename}`;
    }

    const order = await orderService.placeOrder(orderData);

    res.status(201).json({
      success: true,
      data: { orderId: order._id },
      message: "Order placed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const customerId = req.user.id;
    const { reasonCode, reasonText } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }
    const result = await orderService.cancelOrder(orderId, customerId, { reasonCode, reasonText });

    res.status(200).json({
      success: true,
      data: result,
      message: result?.cancellation?.feeAmount > 0
        ? `Order cancelled. INR ${result.cancellation.feeAmount} has been added as cancellation due.`
        : "Order cancelled successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getCancellationDues = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const summary = await orderService.getCancellationDues(customerId);

    res.status(200).json({
      success: true,
      data: summary,
      message: "Cancellation dues fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

const settleCancellationDues = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { amount } = req.body;
    const settlement = await orderService.settleCancellationDuesForCustomer(customerId, amount);

    res.status(200).json({
      success: true,
      data: settlement,
      message: "Cancellation dues settled successfully",
    });
  } catch (err) {
    next(err);
  }
};

const getActiveOrders = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const { page, limit } = req.query;
    const orders = await orderService.getActiveOrders(transporterId, { page, limit });

    if (orders?.items) {
      return res.status(200).json({
        success: true,
        data: orders.items,
        pagination: orders.pagination,
        message: "Active orders fetched successfully",
      });
    }

    res.status(200).json({
      success: true,
      data: orders,
      message: "Active orders fetched successfully",
    });

  } catch (err) {
    next(err);
  }
};


const getCurrentBids = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orderId = req.params.orderId;
    const { page, limit } = req.query;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const bids = await orderService.getCurrentBids(customerId, orderId, { page, limit });

    if (bids?.items) {
      return res.status(200).json({
        success: true,
        data: bids.items,
        pagination: bids.pagination,
        message: "Current bids for the order fetched successfully",
      });
    }

    res.status(200).json({
      success: true,
      data: bids,
      message: "Current bids for the order fetched successfully",
    });

  } catch (err) {
    next(err);
  }
};
const downloadBidQuotePdf = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { orderId, bidId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(
        400,
        "ValidationError",
        "Invalid orderId",
        "ERR_VALIDATION"
      );
    }

    if (!mongoose.Types.ObjectId.isValid(bidId)) {
      throw new AppError(
        400,
        "ValidationError",
        "Invalid bidId",
        "ERR_VALIDATION"
      );
    }

    const order = await orderRepo.getOrderDetailsForCustomer(orderId, customerId);
    if (!order) {
      throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    const bid = await bidRepo.getBidById(bidId);
    if (!bid || bid.order_id?.toString() !== orderId) {
      throw new AppError(404, "NotFound", "Bid not found", "ERR_NOT_FOUND");
    }

    const filename = `quote_${orderId.slice(-8)}_${bidId.slice(-6)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // PDF generation moved to utils
    generateQuotePdf(res, order, bid);
  } catch (err) {
    next(err);
  }
};


const acceptBid = async (req, res, next) => {
  let lockToken = null;
  let lockKey = null;

  try {
    const customerId = req.user.id;
    const orderId = req.params.orderId;
    const bidId = req.params.bidId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(bidId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: bidId, msg: "Not a valid bid ID", path: "bidId", location: "params" }
      );
    }

    const requestIdempotencyKey = getRequestIdempotencyKey(req);
    const fallbackIdempotencyKey = `${customerId}:${orderId}:${bidId}`;
    const idempotencyCacheKey = buildIdempotencyCacheKey({
      scope: 'orders:accept-bid',
      payload: { customerId, orderId, bidId },
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

    lockKey = `lock:orders:accept-bid:${orderId}`;
    const lock = await acquireDistributedLock(lockKey, { ttlSeconds: 15 });
    if (!lock.acquired) {
      throw new AppError(
        409,
        "ConflictError",
        "This order is currently being assigned. Please try again in a few seconds.",
        "ERR_BID_ACCEPT_IN_PROGRESS"
      );
    }
    lockToken = lock.token;

    await orderService.acceptBid(customerId, orderId, bidId);

    const payload = {
      success: true,
      message: "Bid accepted and order assigned successfully"
    };

    if (idempotencyCacheKey) {
      await setCachedJson(idempotencyCacheKey, {
        statusCode: 200,
        payload,
      }, 60 * 60 * 6);
    }

    res.status(200).json(payload);

  } catch (err) {
    next(err);
  } finally {
    if (lockKey && lockToken) {
      await releaseDistributedLock(lockKey, lockToken);
    }
  }
};

const rejectBid = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orderId = req.params.orderId;
    const bidId = req.params.bidId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(bidId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: bidId, msg: "Not a valid bid ID", path: "bidId", location: "params" }
      );
    }

    await orderService.rejectBid(customerId, orderId, bidId);

    res.status(200).json({
      success: true,
      message: "Bid rejected successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getTransporterBids = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const { page, limit } = req.query;

    const bids = await orderService.getTransporterBids(transporterId, { page, limit });

    if (bids?.items) {
      return res.status(200).json({
        success: true,
        data: bids.items,
        pagination: bids.pagination,
        message: "Bids by transporter fetched successfully",
      });
    }

    res.status(200).json({
      success: true,
      data: bids,
      message: "Bids by transporter fetched successfully",
    });

  } catch (err) {
    next(err);
  }
};

const submitBid = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const orderId = req.params.orderId; //reads orderid from url params
    const { bidAmount, notes, quoteBreakdown } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" } //reads orderid from url params
      );
    }

    const requestIdempotencyKey = getRequestIdempotencyKey(req);
    const fallbackIdempotencyKey = `${transporterId}:${orderId}`;
    const idempotencyTtlSeconds = requestIdempotencyKey ? 60 * 60 * 6 : 120;
    const idempotencyCacheKey = buildIdempotencyCacheKey({
      scope: 'orders:submit-bid',
      payload: { transporterId, orderId },
      requestKey: requestIdempotencyKey,
      fallbackKey: fallbackIdempotencyKey,
    });

    if (idempotencyCacheKey) {
      const cached = await getCachedJson(idempotencyCacheKey);
      if (cached) {
        res.setHeader('X-Idempotency-Status', 'REPLAY');
        return res.status(cached.statusCode || 201).json(cached.payload);
      }
    }

    const bid = await orderService.submitBid(transporterId, orderId, bidAmount, notes, quoteBreakdown);

    const payload = {
      success: true,
      data: { bidId: bid._id },
      message: "Bid submitted successfully",
    };

    if (idempotencyCacheKey) {
      await setCachedJson(idempotencyCacheKey, {
        statusCode: 201,
        payload,
      }, idempotencyTtlSeconds);
    }

    res.status(201).json(payload);

  } catch (err) {
    next(err);
  }
};

const withdrawBid = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const bidId = req.params.bidId;

    if (!mongoose.Types.ObjectId.isValid(bidId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: bidId, msg: "Not a valid bid ID", path: "bidId", location: "params" }
      );
    }

    await orderService.withdrawBid(transporterId, bidId);
    res.status(200).json({
      success: true,
      message: "Bid withdrawn successfully"
    });

  } catch (err) {
    next(err);
  }
};


const startTransit = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const transporterId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    await orderService.startTransit(orderId, transporterId);

    res.status(200).json({
      success: true,
      message: "Transit started successfully"
    });
  } catch (err) {
    next(err);
  }
};

const assignVehicle = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const { vehicleId } = req.body;
    const transporterId = req.user.id;

    logger.debug('assignVehicle called', { orderId, vehicleId, transporterId, body: req.body });
    console.log('=== ASSIGN VEHICLE DEBUG ===');
    console.log('orderId:', orderId, 'type:', typeof orderId);
    console.log('vehicleId:', vehicleId, 'type:', typeof vehicleId);
    console.log('req.body:', JSON.stringify(req.body));
    console.log('transporterId:', transporterId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log('VALIDATION FAILED: orderId is not valid ObjectId');
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }
    console.log('✓ orderId validation passed');

    if (!vehicleId) {
      console.log('VALIDATION FAILED: vehicleId is missing or falsy');
      logger.error('vehicleId is missing from request body', req.body);
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: vehicleId, msg: "Vehicle ID is required", path: "vehicleId", location: "body" }
      );
    }
    console.log('✓ vehicleId presence check passed');

    if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
      console.log('VALIDATION FAILED: vehicleId is not a valid ObjectId');
      logger.error('vehicleId is not a valid ObjectId', { vehicleId });
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: vehicleId, msg: "Not a valid vehicle ID", path: "vehicleId", location: "body" }
      );
    }
    console.log('✓ vehicleId ObjectId validation passed');
    console.log('All validations passed, calling service...');

    const updatedOrder = await orderService.assignVehicleToOrder(orderId, vehicleId, transporterId);

    res.status(200).json({
      success: true,
      message: "Vehicle assigned successfully",
      data: updatedOrder
    });
  } catch (err) {
    next(err);
  }
};

const getTransporterVehicles = async (req, res, next) => {
  try {
    const transporterId = req.user.id;

    const vehicles = await orderService.getTransporterVehicles(transporterId);

    res.status(200).json({
      success: true,
      data: vehicles,
      message: "Vehicles fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const confirmPickup = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const orderId = req.params.orderId;
    const { otp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const order = await orderService.confirmPickup(transporterId, orderId, otp);

    res.status(200).json({
      success: true,
      data: order,
      message: "Pickup confirmed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const confirmDelivery = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const orderId = req.params.orderId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const order = await orderService.confirmDelivery(customerId, orderId);

    res.status(200).json({
      success: true,
      data: order,
      message: "Delivery confirmed successfully",
    });
  } catch (err) {
    next(err);
  }
};

const estimatePrice = async (req, res, next) => {
  try {
    const {
      distance,
      vehicle_type,
      weight,
      volume,
      goods_type,
      cargo_value,
      insurance_tier,
      originCoords,
      destCoords,
    } = req.body;

    if (!distance || !vehicle_type || !weight) {
      throw new AppError(
        400,
        'ValidationError',
        'Input Validation failed',
        'ERR_VALIDATION',
        [
          { msg: 'distance, vehicle_type, and weight are required', location: 'body' },
        ]
      );
    }

    const breakdown = await pricingService.calculatePrice({
      distance: parseFloat(distance),
      vehicle_type,
      weight: parseFloat(weight),
      volume: volume != null ? parseFloat(volume) : null,
      goods_type: goods_type || 'general',
      cargo_value: cargo_value ? parseFloat(cargo_value) : 0,
      insurance_tier: insurance_tier || 'none',
      originCoords: originCoords || null,
      destCoords: destCoords || null,
    });

    res.status(200).json({
      success: true,
      data: breakdown,
      message: 'Price estimate calculated successfully',
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getUserOrders,
  placeOrder,
  cancelOrder,
  getCancellationDues,
  settleCancellationDues,
  getCurrentBids,
  downloadBidQuotePdf,
  acceptBid,
  rejectBid,
  getActiveOrders,
  getTransporterBids,
  submitBid,
  withdrawBid,
  getOrderDetails,
  estimatePrice,
};
