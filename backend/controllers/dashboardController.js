import dashboardService from '../services/dashboardService.js';

/**
 * Get customer dashboard data
 */
const getCustomerDashboard = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const dashboardData = await dashboardService.getCustomerDashboard(customerId);

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Customer dashboard data fetched successfully'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get transporter dashboard data
 */
const getTransporterDashboard = async (req, res, next) => {
  try {
    const transporterId = req.user.id;
    const dashboardData = await dashboardService.getTransporterDashboard(transporterId);

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Transporter dashboard data fetched successfully'
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getCustomerDashboard,
  getTransporterDashboard
};
