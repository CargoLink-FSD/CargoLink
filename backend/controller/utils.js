const bcrypt = require('bcrypt');

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


const errorHandler = (err) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return {
      status: 400,
      message: 'Validation failed',
      errors,
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return {
      status: 400,
      message: `Duplicate value for field: ${field}`,
    };
  }

  // Default fallback for unexpected errors
  return {
    status: 500,
    message: 'Internal Server Error',
  };
};



module.exports = {
    asyncHandler, 
    errorHandler,
};