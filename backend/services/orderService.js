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

}