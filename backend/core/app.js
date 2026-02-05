import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import router from '../routes/index.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { errorHandler } from '../utils/misc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Body parsing middleware - order matters!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Set up Routes
app.use(router);

// Express error-handling middleware
app.use((err, req, res, next) => {
  const errorResponse = errorHandler.handleError(err, { request: req, source: 'http' });
  res.status(errorResponse.statusCode || 500).json(errorResponse);
});

export default app;
