import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import router from '../routes/index.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { errorHandler } from '../utils/misc.js';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "http://localhost:3000"],
      },
    },

    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);


app.use(compression());

// Rate limiting - Cant scrape data using the api links and all like puthiyathlaimurai
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // limit tO 100R
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, 
  legacyHeaders: false,
});
app.use(limiter);

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
