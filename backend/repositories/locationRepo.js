// Location Repository — data access for order coordinates
import Order from '../models/order.js';

const updateOrderCoordinates = async (orderId, pickupCoords, deliveryCoords) => {
    return Order.findByIdAndUpdate(orderId, {
        pickup_coordinates: pickupCoords,
        delivery_coordinates: deliveryCoords,
    }, { new: true });
};

export default {
    updateOrderCoordinates,
};
