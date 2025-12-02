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
        order.already_bid = order.bid_by_transporter && order.bid_by_transporter.length > 0;
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
    // Check if order exists and is open for bidding
    const active = await orderRepo.checkActiveOrder(orderId, transporterId);
    if (!active) {
        throw new AppError(404, "NotFound", "Order not found or not up for bidding", "ERR_NOT_FOUND");
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

const confirmPickup = async (transporterId, orderId, otp) => {
    const order = await orderRepo.verifyOTPAndUpdateStatus(orderId, transporterId, otp);
    console.log({order, transporterId, orderId, otp});
    
    if (!order) {
        throw new AppError(400, "InvalidOperation", "Invalid OTP or order not found", "ERR_INVALID_OPERATION");
    }
    return order;
};

const confirmDelivery = async (customerId, orderId) => {
    const exist = await orderRepo.existsOrderForCustomer(orderId, customerId);
    if (!exist) {
        throw new AppError(404, "NotFound", "Order not found or access denied", "ERR_NOT_FOUND");
    }

    const order = await orderRepo.updateOrderStatus(orderId, 'Completed');
    if (!order) {
        throw new AppError(400, "InvalidOperation", "Order cannot be marked as delivered", "ERR_INVALID_OPERATION");
    }
    return order;
};


export default {
    getOrdersByUser,
    getOrderDetails,
    placeOrder,
    cancelOrder,
    getActiveOrders,

    getCurrentBids,
    acceptBid,
    rejectBid,
    getTransporterBids,
    submitBid,
    withdrawBid,
    confirmPickup,
    confirmDelivery,

}