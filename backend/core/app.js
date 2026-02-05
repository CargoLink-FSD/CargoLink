import express from 'express';
import cors from 'cors';
import router from '../routes/index.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { errorHandler } from '../utils/misc.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

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
