import adminService from "../services/adminService.js";
import mongoose from "mongoose";
import { AppError } from "../utils/misc.js";

// Dashboard Analytics
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: "Dashboard statistics fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getOrdersPerDay = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.ordersPerDay,
      message: "Orders per day fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getRevenuePerDay = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.revenuePerDay,
      message: "Revenue per day fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getTopTransporters = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.topTransporters,
      message: "Top transporters fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getOrderStatusDistribution = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.orderStatusDistribution,
      message: "Order status distribution fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getFleetUtilization = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.fleetUtilization,
      message: "Fleet utilization fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getNewCustomersPerMonth = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.newCustomersPerMonth,
      message: "New customers per month fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getMostRequestedTruckTypes = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.truckTypes,
      message: "Most requested truck types fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getPendingVsCompletedOrders = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: stats.orderRatio,
      message: "Pending vs completed orders fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getAverageBidAmount = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    
    res.status(200).json({
      success: true,
      data: { avg_bid: stats.avgBidAmount },
      message: "Average bid amount fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

// Order Management
const getAllOrders = async (req, res, next) => {
  try {
    const { search, status, fromDate, toDate, sort } = req.query;

    const orders = await adminService.getAllOrders({
      search,
      status,
      fromDate,
      toDate,
      sort
    });

    const formattedOrders = orders.map(order => ({
      order_id: order._id,
      customer_name: order.customer_id 
        ? `${order.customer_id.firstName} ${order.customer_id.lastName}` 
        : 'N/A',
      customer_email: order.customer_id?.email || 'N/A',
      transporter_name: order.assigned_transporter_id?.name || 'Not Assigned',
      transporter_email: order.assigned_transporter_id?.email || 'N/A',
      pickup_location: order.pickup_location,
      dropoff_location: order.dropoff_location,
      truck_type: order.truck_type,
      status: order.status,
      final_price: order.final_price,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: formattedOrders,
      message: "Orders fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const order = await adminService.getOrderDetails(orderId);

    // Find the truck assigned to this order if transporter is assigned
    let truckInfo = null;
    if (order.assigned_transporter_id && order.assigned_transporter_id.fleet) {
      const truck = order.assigned_transporter_id.fleet.find(
        f => f.current_order_id?.toString() === orderId
      );
      if (truck) {
        truckInfo = {
          name: truck.name,
          truck_type: truck.truck_type,
          status: truck.status
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        order_id: order._id,
        customer: order.customer_id ? {
          id: order.customer_id._id,
          name: `${order.customer_id.firstName} ${order.customer_id.lastName}`,
          email: order.customer_id.email,
          phone: order.customer_id.phone
        } : null,
        transporter: order.assigned_transporter_id ? {
          id: order.assigned_transporter_id._id,
          name: order.assigned_transporter_id.name,
          email: order.assigned_transporter_id.email,
          contact: order.assigned_transporter_id.primary_contact
        } : null,
        truck: truckInfo,
        pickup_location: order.pickup_location,
        dropoff_location: order.dropoff_location,
        distance: order.distance,
        truck_type: order.truck_type,
        item_details: order.item_details,
        status: order.status,
        final_price: order.final_price,
        otp: order.otp,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: "Order details fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getBidsForOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const bids = await adminService.getBidsForOrder(orderId);

    const formattedBids = bids.map(bid => {
      let truckInfo = null;
      if (bid.transporter_id && bid.transporter_id.fleet) {
        const truck = bid.transporter_id.fleet.find(
          f => f.current_order_id?.toString() === orderId
        );
        if (truck) {
          truckInfo = {
            name: truck.name,
            truck_type: truck.truck_type
          };
        }
      }

      return {
        bid_id: bid._id,
        transporter: {
          id: bid.transporter_id._id,
          name: bid.transporter_id.name,
          email: bid.transporter_id.email,
          contact: bid.transporter_id.primary_contact
        },
        truck: truckInfo,
        bid_amount: bid.bid_amount,
        notes: bid.notes,
        createdAt: bid.createdAt
      };
    });

    res.status(200).json({
      success: true,
      data: formattedBids,
      message: "Bids fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getBidCountForOrder = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: orderId, msg: "Not a valid order ID", path: "orderId", location: "params" }
      );
    }

    const count = await adminService.getBidCountForOrder(orderId);

    res.status(200).json({
      success: true,
      data: { count },
      message: "Bid count fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

// User Management
const getAllUsers = async (req, res, next) => {
  try {
    const { role = 'customer', search, sort } = req.query;

    const users = await adminService.getAllUsers(role, { search, sort });

    res.status(200).json({
      success: true,
      data: { users },
      message: `${role}s fetched successfully`
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { role, id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: id, msg: "Not a valid user ID", path: "id", location: "params" }
      );
    }

    const result = await adminService.deleteUser(role, id);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

export default {
  // Dashboard Analytics
  getDashboardStats,
  getOrdersPerDay,
  getRevenuePerDay,
  getTopTransporters,
  getOrderStatusDistribution,
  getFleetUtilization,
  getNewCustomersPerMonth,
  getMostRequestedTruckTypes,
  getPendingVsCompletedOrders,
  getAverageBidAmount,
  
  // Order Management
  getAllOrders,
  getOrderDetails,
  getBidsForOrder,
  getBidCountForOrder,
  
  // User Management
  getAllUsers,
  deleteUser
};
