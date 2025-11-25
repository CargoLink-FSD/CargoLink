import express from 'express';
import router from '../routes/index.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { errorHandler } from '../utils/misc.js';

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

export default app;
