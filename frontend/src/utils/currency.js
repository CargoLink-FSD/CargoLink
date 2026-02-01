/**
 * Utility functions for currency formatting
 */

/**
 * Format amount as Indian Rupees (INR)
 * @param {number|string} amount - The amount to format
 * @param {object} options - Formatting options
 * @param {boolean} options.includeDecimals - Whether to include decimal places (default: false)
 * @param {boolean} options.includeSymbol - Whether to include ₹ symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  const {
    includeDecimals = false,
    includeSymbol = true
  } = options;

  if (amount === null || amount === undefined || amount === '') {
    return '—';
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    return '—';
  }

  const formatted = includeDecimals
    ? numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : numAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return includeSymbol ? `₹${formatted}` : formatted;
};

/**
 * Calculate adjusted price based on delivery status
 * @param {number} price - Original price
 * @param {string} deliveryStatus - Delivery status ('Delivered', 'Damaged', etc.)
 * @returns {number} Adjusted price (90% if damaged, full price otherwise)
 */
export const calculateAdjustedPrice = (price, deliveryStatus) => {
  const numPrice = Number(price);
  if (isNaN(numPrice)) return 0;
  
  return deliveryStatus === 'Damaged' ? numPrice * 0.9 : numPrice;
};

/**
 * Calculate total amount from shipment items considering damage adjustments
 * @param {Array} shipments - Array of shipment items with price and delivery_status
 * @returns {number} Total adjusted amount
 */
export const calculateShipmentsTotal = (shipments) => {
  if (!Array.isArray(shipments) || shipments.length === 0) {
    return 0;
  }

  return shipments.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    const adjustedPrice = calculateAdjustedPrice(price, item.delivery_status);
    return total + adjustedPrice;
  }, 0);
};

export default {
  formatCurrency,
  calculateAdjustedPrice,
  calculateShipmentsTotal
};
