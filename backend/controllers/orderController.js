import orderService from "../services/orderService.js";
import mongoose from "mongoose";
import { logger, AppError } from "../utils/misc.js";


const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const orders = await orderService.getOrdersByUser(userId, role);

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

    if(!mongoose.Types.ObjectId.isValid(orderId)) {
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
  try{
    const orderId = req.params.orderId;
    const customerId = req.user.id;

    if(!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }
    await orderService.cancelOrder(orderId, customerId);

    res.status(200).json({ 
      success: true, 
      message: "Order cancelled successfully" 
    });
  } catch (err) {
    next(err);
  }
};

const getActiveOrders = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const orders = await orderService.getActiveOrders(transporterId);
    res.status(200).json({ 
      success: true, 
      data: orders ,
      message: "Active orders fetched successfully",
    });

  } catch (err) {
    next(err);
  }
};


const getCurrentBids = async (req, res, next) => {
  try{
    const customerId = req.user.id;
    const orderId = req.params.orderId;

    if(!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const bids = await orderService.getCurrentBids(customerId, orderId);

    res.status(200).json({ 
      success: true, 
      data: bids,
      message: "Current bids for the order fetched successfully",
    });

  } catch (err) {
    next(err);
  }
};


const acceptBid = async (req, res, next) => {
  try{
    const customerId = req.user.id;
    const orderId = req.params.orderId;
    const bidId = req.params.bidId;

    if(!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }
    if(!mongoose.Types.ObjectId.isValid(bidId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: bidId, msg: "Not a valid bid ID", path: "bidId", location: "params" }
      );
    }

    await orderService.acceptBid(customerId, orderId, bidId);

    res.status(200).json({ 
      success: true, 
      message: "Bid accepted and order assigned successfully" 
    });

  } catch (err) {
    next(err);
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
  try{
    const transporterId = req.user.id;

    const bids = await orderService.getTransporterBids(transporterId);

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
  try{
    const transporterId = req.user.id;
    const orderId = req.params.orderId; //reads orderid from url params
    const { bidAmount, notes } = req.body;

    if(!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" } //reads orderid from url params
      );
    }

    const bid = await orderService.submitBid(transporterId, orderId, bidAmount, notes);

    res.status(201).json({ 
      success: true, 
      data: { bidId: bid._id }, 
      message: "Bid submitted successfully", 
    });

  } catch (err) {
    next(err);
  }
};

const withdrawBid = async (req, res, next) => {
  try{
    const transporterId = req.user.id;
    const bidId = req.params.bidId;

    if(!mongoose.Types.ObjectId.isValid(bidId)) {
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
  // Placeholder for confirming order pickup
};

const confirmDelivery = async (req, res, next) => {
  // Placeholder for confirming order delivery
};

const submitRating = async (req, res, next) => {
  // Placeholder for submitting a rating for an order
};


export default {
  getUserOrders,

  placeOrder,
  cancelOrder,
  startTransit,
  assignVehicle,
  getTransporterVehicles,
  confirmPickup,
  confirmDelivery,
  getCurrentBids,
  acceptBid,
  rejectBid,
  submitRating,
  getActiveOrders,
  getTransporterBids,
  submitBid,
  withdrawBid,
  getOrderDetails,
};
