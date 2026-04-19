import adminService from "../services/adminService.js";
import managerRepo from "../repositories/managerRepo.js";
import mongoose from "mongoose";
import Fleet from "../models/fleet.js";
import { AppError } from "../utils/misc.js";

const getDashboardOptions = (req) => ({
  range: req?.query?.range,
});

// Dashboard Analytics
const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

    res.status(200).json({
      success: true,
      data: stats.topTransporters,
      message: "Top transporters fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getTopRoutes = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

    res.status(200).json({
      success: true,
      data: stats.topRoutes,
      message: "Top routes fetched successfully"
    });
  } catch (err) {
    next(err);
  }
};

const getOrderStatusDistribution = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const stats = await adminService.getDashboardStats(getDashboardOptions(req));

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
    const { search, status, fromDate, toDate, sort, page, limit } = req.query;

    const orderResult = await adminService.getAllOrders({
      search,
      status,
      fromDate,
      toDate,
      sort,
      page,
      limit,
    });

    const orders = orderResult?.items || orderResult;

    const formattedOrders = orders.map(order => ({
      order_id: order._id,
      customer_name: order.customer_id
        ? `${order.customer_id.firstName} ${order.customer_id.lastName}`
        : 'N/A',
      customer_email: order.customer_id?.email || 'N/A',
      transporter_name: order.assigned_transporter_id?.name || 'Not Assigned',
      transporter_email: order.assigned_transporter_id?.email || 'N/A',
      pickup_location: order.pickup ? `${order.pickup.city}, ${order.pickup.state}` : 'N/A',
      dropoff_location: order.delivery ? `${order.delivery.city}, ${order.delivery.state}` : 'N/A',
      truck_type: order.truck_type,
      status: order.status,
      final_price: order.final_price,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    const response = {
      success: true,
      data: formattedOrders,
      message: "Orders fetched successfully"
    };

    if (orderResult?.pagination) {
      response.pagination = orderResult.pagination;
    }

    res.status(200).json(response);
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

    // Find the truck assigned to this order from separate Fleet collection
    let truckInfo = null;
    if (order.assigned_transporter_id) {
      const truck = await Fleet.findOne({
        transporter_id: order.assigned_transporter_id._id,
        current_trip_id: orderId
      });
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

    const formattedBids = await Promise.all(bids.map(async (bid) => {
      let truckInfo = null;
      if (bid.transporter_id) {
        const truck = await Fleet.findOne({
          transporter_id: bid.transporter_id._id,
          current_trip_id: orderId
        });
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
    }));

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
    const { role = 'customer', search, sort, page, limit } = req.query;

    const userResult = await adminService.getAllUsers(role, { search, sort, page, limit });
    const users = userResult?.items || userResult;

    const response = {
      success: true,
      data: { users },
      message: `${role}s fetched successfully`
    };

    if (userResult?.pagination) {
      response.pagination = userResult.pagination;
    }

    res.status(200).json(response);
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

// Fleet Overview
const getFleetOverview = async (req, res, next) => {
  try {
    const data = await adminService.getFleetOverview();
    res.status(200).json({ success: true, data, message: "Fleet overview fetched successfully" });
  } catch (err) {
    next(err);
  }
};

// Tickets Overview
const getTicketsOverview = async (req, res, next) => {
  try {
    const data = await adminService.getTicketsOverview();
    res.status(200).json({ success: true, data, message: "Tickets overview fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const getTicketDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid ticket ID", "ERR_VALIDATION");
    }

    const data = await adminService.getTicketDetail(id);
    res.status(200).json({ success: true, data, message: "Ticket detail fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const replyToTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid ticket ID", "ERR_VALIDATION");
    }

    const data = await adminService.replyToTicket(id, text);
    res.status(200).json({ success: true, data, message: "Reply sent successfully" });
  } catch (err) {
    next(err);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid ticket ID", "ERR_VALIDATION");
    }

    const data = await adminService.updateTicketStatus(id, status);
    res.status(200).json({ success: true, data, message: "Ticket status updated successfully" });
  } catch (err) {
    next(err);
  }
};

const getVerificationQueue = async (req, res, next) => {
  try {
    const data = await adminService.getVerificationQueue();
    res.status(200).json({ success: true, data, message: "Verification queue fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const approveVerificationDocument = async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const { entityType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid entity ID", "ERR_VALIDATION");
    }

    const data = await adminService.approveVerificationDocument(id, entityType || 'transporter', docType);
    res.status(200).json({ success: true, data, message: "Document approved successfully" });
  } catch (err) {
    next(err);
  }
};

const rejectVerificationDocument = async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const { entityType, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid entity ID", "ERR_VALIDATION");
    }

    const data = await adminService.rejectVerificationDocument(id, entityType || 'transporter', docType, note);
    res.status(200).json({ success: true, data, message: "Document rejected successfully" });
  } catch (err) {
    next(err);
  }
};

const getAllTrips = async (req, res, next) => {
  try {
    const { status, transporterId, driverId, search, page, limit, sort } = req.query;
    const data = await adminService.getAllTrips({ status, transporterId, driverId, search, page, limit, sort });
    res.status(200).json({ success: true, data, message: "Trips fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const getTripDetail = async (req, res, next) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw new AppError(400, "ValidationError", "Invalid trip ID", "ERR_VALIDATION");
    }

    const data = await adminService.getTripDetail(tripId);
    res.status(200).json({ success: true, data, message: "Trip detail fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const { status, paymentType, search, page, limit, sort } = req.query;
    const data = await adminService.getAllPayments({ status, paymentType, search, page, limit, sort });
    res.status(200).json({ success: true, data, message: "Payments fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const getPaymentDetail = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new AppError(400, "ValidationError", "Invalid payment ID", "ERR_VALIDATION");
    }

    const data = await adminService.getPaymentDetail(paymentId);
    res.status(200).json({ success: true, data, message: "Payment detail fetched successfully" });
  } catch (err) {
    next(err);
  }
};

// Cashouts Overview
const getAllCashouts = async (req, res, next) => {
  try {
    const { status, search, page, limit, sort } = req.query;
    const data = await adminService.getAllCashouts({ status, search, page, limit, sort });
    res.status(200).json({ success: true, data, message: "Cashouts fetched successfully" });
  } catch (err) {
    next(err);
  }
};

const updateCashoutStatus = async (req, res, next) => {
  try {
    const { cashoutId } = req.params;
    const { status, note, razorpayPayoutId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cashoutId)) {
      throw new AppError(400, "ValidationError", "Invalid cashout ID", "ERR_VALIDATION");
    }

    const data = await adminService.updateCashoutStatus(cashoutId, { status, note, razorpayPayoutId });
    res.status(200).json({ success: true, data, message: "Cashout status updated successfully" });
  } catch (err) {
    next(err);
  }
};

// ============================================
// Manager Management
// ============================================

// Get all managers
const getAllManagers = async (req, res, next) => {
  try {
    const managers = await managerRepo.getAllManagers();
    const stats = await managerRepo.getManagerStats();
    res.status(200).json({
      success: true,
      data: { managers, stats },
      message: "Managers fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Generate invitation code for a new manager
const generateInvitationCode = async (req, res, next) => {
  try {
    const { categories, verificationCategories = [], expiresInHours = 24 } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw new AppError(400, "ValidationError", "At least one category is required", "ERR_VALIDATION");
    }

    const validCategories = [
      'Shipment Issue', 'Payment Issue', 'Transporter Complaint',
      'Customer Complaint', 'Driver Complaint', 'Technical Issue', 'Account Issue', 'Other',
    ];
    const invalidCats = categories.filter(c => !validCategories.includes(c));
    if (invalidCats.length > 0) {
      throw new AppError(400, "ValidationError", `Invalid categories: ${invalidCats.join(', ')}`, "ERR_VALIDATION");
    }

    const validVerifCats = ['transporter_verification', 'driver_verification', 'vehicle_verification'];
    if (verificationCategories.length > 0) {
      const invalidVerif = verificationCategories.filter(c => !validVerifCats.includes(c));
      if (invalidVerif.length > 0) {
        throw new AppError(400, "ValidationError", `Invalid verification categories: ${invalidVerif.join(', ')}`, "ERR_VALIDATION");
      }
    }

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    const invitation = await managerRepo.createInvitationCode({
      categories,
      verificationCategories,
      expiresAt,
      createdBy: 'admin',
    });

    res.status(201).json({
      success: true,
      data: invitation,
      message: `Invitation code generated: ${invitation.code}`,
    });
  } catch (err) {
    next(err);
  }
};

// Get all invitation codes
const getAllInvitationCodes = async (req, res, next) => {
  try {
    const codes = await managerRepo.getAllInvitationCodes();
    res.status(200).json({
      success: true,
      data: codes,
      message: "Invitation codes fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Update manager status (activate/deactivate)
const updateManagerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid manager ID", "ERR_VALIDATION");
    }

    if (!['active', 'inactive'].includes(status)) {
      throw new AppError(400, "ValidationError", "Status must be 'active' or 'inactive'", "ERR_VALIDATION");
    }

    const manager = await managerRepo.updateManager(id, { status });
    if (!manager) {
      throw new AppError(404, "NotFound", "Manager not found", "ERR_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: manager,
      message: `Manager ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    next(err);
  }
};

// Update manager categories
const updateManagerCategories = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { categories } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid manager ID", "ERR_VALIDATION");
    }

    if (!categories || !Array.isArray(categories)) {
      throw new AppError(400, "ValidationError", "Categories must be an array", "ERR_VALIDATION");
    }

    const { verificationCategories } = req.body;
    const updates = { categories };
    if (verificationCategories && Array.isArray(verificationCategories)) {
      updates.verificationCategories = verificationCategories;
    }

    const manager = await managerRepo.updateManager(id, updates);
    if (!manager) {
      throw new AppError(404, "NotFound", "Manager not found", "ERR_NOT_FOUND");
    }

    res.status(200).json({
      success: true,
      data: manager,
      message: "Manager categories updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Delete a manager
const deleteManager = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", "Invalid manager ID", "ERR_VALIDATION");
    }

    const manager = await managerRepo.findManagerById(id);
    if (!manager) {
      throw new AppError(404, "NotFound", "Manager not found", "ERR_NOT_FOUND");
    }

    if (manager.isDefault) {
      throw new AppError(400, "ValidationError", "Cannot delete the default manager", "ERR_DEFAULT_MANAGER");
    }

    await managerRepo.deleteManager(id);

    res.status(200).json({
      success: true,
      message: "Manager deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

// ============================================
// Threshold Configuration
// ============================================

const getThresholdConfigs = async (req, res, next) => {
  try {
    const configs = await managerRepo.getAllThresholdConfigs();
    res.status(200).json({
      success: true,
      data: configs,
      message: "Threshold configs fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

const updateThresholdConfig = async (req, res, next) => {
  try {
    const { category, maxTicketsPerHour } = req.body;

    if (!category || !maxTicketsPerHour) {
      throw new AppError(400, "ValidationError", "Category and maxTicketsPerHour are required", "ERR_VALIDATION");
    }

    const config = await managerRepo.upsertThresholdConfig(category, maxTicketsPerHour);
    res.status(200).json({
      success: true,
      data: config,
      message: "Threshold updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const resetThresholdAlert = async (req, res, next) => {
  try {
    const { category } = req.body;
    if (!category) {
      throw new AppError(400, "ValidationError", "Category is required", "ERR_VALIDATION");
    }
    const config = await managerRepo.resetAlert(category);
    res.status(200).json({
      success: true,
      data: config,
      message: "Alert reset successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Ticket volume analytics
const getTicketVolumeByCategory = async (req, res, next) => {
  try {
    const volume = await managerRepo.getTicketVolumeByCategory();
    res.status(200).json({
      success: true,
      data: volume,
      message: "Ticket volume fetched successfully",
    });
  } catch (err) {
    next(err);
  }
};

// Individual User Detail
const getUserDetail = async (req, res, next) => {
  try {
    const { role, id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, "ValidationError", 'Input Validation failed', 'ERR_VALIDATION',
        { type: "field", value: id, msg: "Not a valid user ID", path: "id", location: "params" }
      );
    }
    const detail = await adminService.getUserDetail(role, id);
    res.status(200).json({ success: true, data: detail, message: "User detail fetched successfully" });
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
  getTopRoutes,
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
  deleteUser,
  getUserDetail,

  // Fleet
  getFleetOverview,

  // Tickets
  getTicketsOverview,
  getTicketDetail,
  replyToTicket,
  updateTicketStatus,

  // Verification
  getVerificationQueue,
  approveVerificationDocument,
  rejectVerificationDocument,

  // Trips
  getAllTrips,
  getTripDetail,

  // Payments
  getAllPayments,
  getPaymentDetail,

  // Cashouts
  getAllCashouts,
  updateCashoutStatus,

  // Manager Management
  getAllManagers,
  generateInvitationCode,
  getAllInvitationCodes,
  updateManagerStatus,
  updateManagerCategories,
  deleteManager,

  // Threshold
  getThresholdConfigs,
  updateThresholdConfig,
  resetThresholdAlert,
  getTicketVolumeByCategory,
};

