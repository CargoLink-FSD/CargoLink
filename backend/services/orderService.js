import orderRepo from "../repositories/orderRepo.js"
import bidRepo from "../repositories/bidRepo.js"
import { AppError, logger } from "../utils/misc.js"


const getOrdersByUser = async (userId, role) => {
    let orders;
    if (role === 'customer') {
        orders =  await orderRepo.getOrdersByCustomer(userId);
    } else if (role === 'transporter') {
        orders =  await orderRepo.getOrdersByTransporter(userId);
        orders.forEach(order => {
            delete order.otp;
        });
    }
    return orders;
    
};

const getOrderDetails = async (orderId, userId, role) => {
    let order;
    if (role === 'customer') {
        order = await orderRepo.getOrderDetailsForCustomer(orderId, userId);
    } else if (role === 'transporter') {
        order = await orderRepo.getOrderDetailsForTransporter(orderId, userId);
    }
    if (!order) {
        throw new AppError(404, "NotFound", "Order not found or access denied", "ERR_NOT_FOUND");
    }
    return order;
};

const placeOrder = async (orderData) => {
    const order = await orderRepo.createOrder(orderData);
    return order;
};

const cancelOrder = async (orderId, customerId) => {
    const exist = await orderRepo.existsOrderForCustomer(orderId, customerId);
    if (!exist) {
        throw new AppError(404, "NotFound", "Order not found or access denied", "ERR_NOT_FOUND");
    }
    const order = await orderRepo.cancelOrder(orderId);
    if (!order) {
        throw new AppError(400, "InvalidOperation", "Only pending orders can be cancelled", "ERR_INVALID_OPERATION");
    }
    return order;
};

const getActiveOrders = async (transporterId) => {
    const orders = await orderRepo.getActiveOrders(transporterId);

    orders.forEach(order => {
        order.already_bid = !!order.bid_by_transporter;
        delete order.bid_by_transporter;
    });

    return orders;
};

const getCurrentBids = async (customerId, orderId) => {
    const exist = await orderRepo.existsOrderForCustomer(orderId, customerId);
    if (!exist) {
        throw new AppError(404, "NotFound", "Order not found or access denied", "ERR_NOT_FOUND");
    }
    const bids = await bidRepo.getBidsForOrder(orderId);
    return bids;
};

const acceptBid = async (customerId, orderId, bidId) => {
    const exist = await orderRepo.existsOrderForCustomer(orderId, customerId);
    if (!exist) {
        throw new AppError(404, "NotFound", "Order not found or access denied", "ERR_NOT_FOUND");
    }

    const bid = await bidRepo.getBidById(bidId);
    if (!bid || bid.order_id.toString() !== orderId) {
        throw new AppError(404, "NotFound", "Bid not found for the specified order", "ERR_NOT_FOUND");
    }

    // Validate bidding window is still open 
    const orderDetails = await orderRepo.getOrderDetailsForCustomer(orderId, customerId);
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    
    if (orderDetails.scheduled_at < twoDaysFromNow) {
        throw new AppError(400, "ValidationError", 
            "Bidding window has closed. Cannot accept bids within 2 days of scheduled pickup", 
            "ERR_BIDDING_CLOSED");
    }

    const order = await orderRepo.assignOrder(orderId, bid.transporter_id, bid.bid_amount);
    if (!order) {
        throw new AppError(403, "Forbidden", "Order already assigned or cannot be updated", "ERR_FORBIDDEN");
    }

    await bidRepo.deleteBidsForOrder(orderId);

    return;
};

const rejectBid = async (customerId, orderId, bidId) => {
    const exist = await orderRepo.existsOrderForCustomer(orderId, customerId);
    if (!exist) {
        throw new AppError(404, "NotFound", "Order not found or access denied", "ERR_NOT_FOUND");
    }

    const bid = await bidRepo.getBidById(bidId);
    if (!bid || bid.order_id.toString() !== orderId) {
        throw new AppError(404, "NotFound", "Bid not found for the specified order", "ERR_NOT_FOUND");
    }

    await bidRepo.deleteBidById(bidId);

    return;
};

const getTransporterBids = async (transporterId) => {
    const bids = await bidRepo.getBidsByTransporter(transporterId);
    return bids;
};

const submitBid = async (transporterId, orderId, bidAmount, notes) => {
    // Check if order exists and is open for bidding (must be at least 2 days before pickup)
    const active = await orderRepo.checkActiveOrder(orderId, transporterId);
    if (!active) {
        throw new AppError(400, "ValidationError", 
            "Bidding window has closed or order is not available. Bids can only be placed at least 2 days before scheduled pickup", 
            "ERR_BIDDING_CLOSED");
    }

    const bid = await bidRepo.createBid({
        order_id: orderId, 
        transporter_id: transporterId, 
        bid_amount: bidAmount, 
        notes: notes
    });

    return bid;
};

const withdrawBid = async (bidId, transporterId) => {
    const exist = await bidRepo.existsBidForTransporter(bidId, transporterId);
    if (!exist) {
        throw new AppError(404, "NotFound", "Bid not found or access denied", "ERR_NOT_FOUND");
    }

    await bidRepo.deleteBidById(bidId);

    return;
};

const startTransit = async (orderId, transporterId) => {
    // Check if order exists and is assigned to this transporter
    const order = await orderRepo.getOrderById(orderId);
    
    if (!order) {
        throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    if (order.assigned_transporter_id?.toString() !== transporterId) {
        throw new AppError(403, "Forbidden", "You are not authorized to start transit for this order", "ERR_FORBIDDEN");
    }

    if (order.status !== 'Assigned') {
        throw new AppError(400, "InvalidOperation", "Only assigned orders can be started", "ERR_INVALID_OPERATION");
    }

    // Generate OTP for pickup confirmation
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Update order status to Started
    const updatedOrder = await orderRepo.updateOrderStatus(orderId, 'Started', { otp });

    return updatedOrder;
};

const assignVehicleToOrder = async (orderId, vehicleId, transporterId) => {
    // Import transporter model
    const Transporter = (await import('../models/transporter.js')).default;

    // Check if order exists and is assigned to this transporter
    const order = await orderRepo.getOrderById(orderId);
    
    if (!order) {
        throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    if (order.assigned_transporter_id?.toString() !== transporterId) {
        throw new AppError(403, "Forbidden", "You are not authorized to assign vehicle to this order", "ERR_FORBIDDEN");
    }

    if (order.status !== 'Assigned') {
        throw new AppError(400, "InvalidOperation", "Only assigned orders can have vehicles assigned", "ERR_INVALID_OPERATION");
    }

    // Find transporter and vehicle
    const transporter = await Transporter.findById(transporterId);
    if (!transporter) {
        throw new AppError(404, "NotFound", "Transporter not found", "ERR_NOT_FOUND");
    }

    const vehicle = transporter.fleet.id(vehicleId);
    if (!vehicle) {
        throw new AppError(404, "NotFound", "Vehicle not found in your fleet", "ERR_NOT_FOUND");
    }

    // Check vehicle availability
    if (vehicle.status !== 'Available') {
        throw new AppError(400, "InvalidOperation", "Vehicle is not available", "ERR_INVALID_OPERATION");
    }

    // Update vehicle status
    vehicle.status = 'Assigned';
    vehicle.current_trip_id = orderId;
    await transporter.save();

    // Assign vehicle to order
    const assignmentData = {
        vehicle_id: vehicle._id,
        vehicle_number: vehicle.registration,
        vehicle_type: vehicle.truck_type
    };

    const updatedOrder = await orderRepo.assignVehicleToOrder(orderId, assignmentData);

    return updatedOrder;
};

const getTransporterVehicles = async (transporterId) => {
    const Transporter = (await import('../models/transporter.js')).default;
    
    const transporter = await Transporter.findById(transporterId).select('fleet');
    if (!transporter) {
        throw new AppError(404, "NotFound", "Transporter not found", "ERR_NOT_FOUND");
    }

    // Filter available vehicles
    const availableVehicles = transporter.fleet.filter(
        vehicle => vehicle.status === 'Available'
    );

    return availableVehicles;
};

export default {
    getOrdersByUser,
    getOrderDetails,
    placeOrder,
    cancelOrder,
    startTransit,
    getActiveOrders,
    assignVehicleToOrder,
    getTransporterVehicles,

    getCurrentBids,
    acceptBid,
    rejectBid,
    getTransporterBids,
    submitBid,
    withdrawBid,

}