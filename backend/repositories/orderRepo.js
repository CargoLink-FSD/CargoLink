import Order from '../models/order.js';


const countOrdersByCustomer = async (customerId) => {
  return  Order.aggregate()
    .match({ customer_id: customerId })
    .group({ _id :"$status", count: { $sum:1 }})
};

const countOrdersByTransporter = async (transporterId) => {
  return  Order.aggregate()
    .match({ transporter_id: transporterId })
    .group({ _id :"$status", count: { $sum:1 }})
};

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
    const order = await Order.findOne({ _id: orderId, assigned_transporter_id: transporterId })
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
    const orders = await Order.find({ status: 'Placed' })
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
        },
        { new: true }
    );
    return updatedOrder;
};

const checkActiveOrder = async (orderId, transporterId) => {
    const order = await Order.exists({
      _id: orderId,
      status: "Placed"
    });
    return order;
};

const getOrderById = async (orderId) => {
    return await Order.findById(orderId);
};

const updateOrderStatus = async (orderId, status, additionalData = {}) => {
    const updateData = { status, ...additionalData };
    const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: updateData },
        { new: true }
    );
    return updatedOrder;
};

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
    getOrderById,
    updateOrderStatus,
    assignVehicleToOrder,
}