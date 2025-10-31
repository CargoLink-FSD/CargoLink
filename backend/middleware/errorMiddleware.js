const {errorHandler} = require('../controller/utils')

const errorMiddleware = (err, req, res, next) => {
 
    console.error(err);
    const { status, message, errors } = errorHandler(err);
    return res.status(status).json({
        success: false,
        message,
        ...(errors && { errors })
    });
};

module.exports = errorMiddleware;