import express from "express";
import mongoose from "mongoose";
import router from "./routes/index.js";
import { errorHandler, logger } from "./utils/misc.js";
import { requestLogger } from "./middlewares/requestLogger.js";


const PORT = 3000;
const MONGO_URI = 'mongodb://127.0.0.1:27017/CargoLink';

const app = express();
app.use(express.json());
app.use(requestLogger);

// Set up Routes
app.use(router);


// Express error-handling middleware
app.use((err, req, res, next) => {
  const errorResponse = errorHandler.handleError(err, { request: req, source: 'http' });
  res.status(errorResponse.statusCode || 500).json(errorResponse);
});

// Handle uncaught exceptions (synchronous errors outside request cycle)
process.on('uncaughtException', (err) => {
  errorHandler.handleError(err, 'uncaughtException');
});

// Handle unhandled promise rejections (async errors outside request cycle)
process.on('unhandledRejection', (reason, promise) => {
  errorHandler.handleError(reason, 'unhandledRejection');
});


// Start Database
(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    logger.info('MongoDB connected');
  } catch (err) {
    errorHandler.handleError(err, 'startup');
  }
})();

// Start server
app.listen(PORT, "0.0.0.0", () =>
  logger.info(`Server running on http://localhost:${PORT}`),
);