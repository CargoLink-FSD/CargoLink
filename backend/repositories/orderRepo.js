import Order from '../models/order.js';


const countOrdersByCustomer = async (customerId) => {
    return Order.aggregate()
        .match({ customer_id: customerId })
        .group({ _id: "$status", count: { $sum: 1 } })
};

const countOrdersByTransporter = async (transporterId) => {
    return Order.aggregate()
      .match({ assigned_transporter_id: transporterId }) 
      .group({ _id: "$status", count: { $sum: 1 } });
  };
//         .match({ transporter_id: transporterId })
//         .group({ _id: "$status", count: { $sum: 1 } })
// };

const getOrdersByCustomer = async (customerId) => {
    const orders = await Order.find({ customer_id: customerId });
    return orders;
};

const getOrdersByTransporter = async (transporterId) => {
    const orders = await Order.find({ assigned_transporter_id: transporterId }).select('-bid_by_transporter -otp');
    return orders;
};

const getOrderDetailsForCustomer = async (orderId, customerId) => {
    const order = await Order.findOne({ _id: orderId, customer_id: customerId })
        .populate('assigned_transporter_id', 'name primary_contact email');
    return order;
};

const getOrderDetailsForTransporter = async (orderId, transporterId) => {
    // Allow transporters to view both:
    // 1. Orders assigned to them
    // 2. Unassigned orders (status: "Placed") for bidding
    const order = await Order.findOne({
        _id: orderId,
        $or: [
            { assigned_transporter_id: transporterId },
            { status: "Placed", assigned_transporter_id: null }
        ]
    })
        .populate('customer_id', 'firstName lastName phone email')
        .select('-otp');
    return order;
};

const existsOrderForCustomer = async (orderId, customerId) => {
    return await Order.exists({ _id: orderId, customer_id: customerId });
};

const createOrder = async (orderData) => {
    const order = new Order(orderData);
    await order.save();
    return order;
};

const cancelOrder = async (orderId, customerId) => {
    const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId, customer_id: customerId, status: "Placed" },
        { $set: { status: "Cancelled" } },
        { new: true }
    );
    return updatedOrder;
};

const getActiveOrders = async (transporterId) => {
    // only shows order before 2days of scheduled pickup
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
        status: 'Placed',
        scheduled_at: { $gte: twoDaysFromNow } // Filter out orders with closed bidding window
    })
        .populate({
            path: 'bid_by_transporter',
            match: { transporter_id: transporterId },
            select: '_id'
        })
        .lean();
    return orders;
};

const assignOrder = async (orderId, transporterId, finalPrice) => {
    const updatedOrder = await Order.findOneAndUpdate(
        {
            _id: orderId,
            status: 'Placed'
        },
        {
            assigned_transporter_id: transporterId,
            final_price: finalPrice,
            status: 'Assigned',
            assignment: {} // Initialize empty assignment object
        },
        { new: true }
    );
    return updatedOrder;
};

const checkActiveOrder = async (orderId, transporterId) => {
    // Bidding window closes 2 days before scheduled pickup
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const order = await Order.exists({
        _id: orderId,
        status: "Placed",
        scheduled_at: { $gte: twoDaysFromNow } // Pickup must be at least 2 days away
    });
    return order;
};

const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    const updateData = { status, ...additionalData };

    return await Order.findByIdAndUpdate(
        orderId,
        updateData,
        { new: true }
    );
};

// Verify OTP and Update Status
const verifyOTPAndUpdateStatus = async (orderId, transporterId, otp) => {
    return await Order.findOneAndUpdate(
        {
            _id: orderId,
            assigned_transporter_id: transporterId,
            otp: otp,
            status: 'Started'
        },
        {
            status: 'In Transit',
            $unset: { otp: 1 }
        },
        { new: true }
    );
};


const getOrderById = async (orderId) => {
    return await Order.findById(orderId);
};

// const updateOrderStatus = async (orderId, status, additionalData = {}) => {
//     const updateData = { status, ...additionalData };
//     const updatedOrder = await Order.findByIdAndUpdate(
//         orderId,
//         { $set: updateData },
//         { new: true }
//     );
//     return updatedOrder;
// };

const assignVehicleToOrder = async (orderId, assignmentData) => {
    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                'assignment.vehicle_id': assignmentData.vehicle_id,
                'assignment.vehicle_number': assignmentData.vehicle_number,
                'assignment.vehicle_type': assignmentData.vehicle_type,
                'assignment.assigned_at': new Date()
            }
        },
        { new: true }
    );
    return updatedOrder;
};

export default {
    countOrdersByCustomer,
    countOrdersByTransporter,
    getOrdersByCustomer,
    getOrdersByTransporter,
    getOrderDetailsForCustomer,
    getOrderDetailsForTransporter,
    existsOrderForCustomer,
    createOrder,
    cancelOrder,
    getActiveOrders,
    assignOrder,
    checkActiveOrder,
    updateOrderStatus,
    verifyOTPAndUpdateStatus,
    getOrderById,
    assignVehicleToOrder,
}