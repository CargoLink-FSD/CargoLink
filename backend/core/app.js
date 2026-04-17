import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import router from '../routes/index.js';
import { requestLogger } from '../middlewares/requestLogger.js';
import { errorHandler, logger } from '../utils/misc.js';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { getUploadRoot } from '../config/uploadPaths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
const swaggerDocument = YAML.load(openApiPath);

const app = express();
const uploadsRoot = getUploadRoot();

// GAE terminates SSL and proxies requests — trust the X-Forwarded-For header
// so express-rate-limit and req.ip work correctly behind the load balancer.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}


const parseAllowedOrigins = () => {
  if (process.env.CORS_ALLOWED_ORIGINS) {
    return new Set(
      process.env.CORS_ALLOWED_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
  }

  const defaults = ['http://localhost:5173'];
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;

  if (projectId) {
    defaults.push(`https://${projectId}.appspot.com`);
    defaults.push(`https://frontend-dot-${projectId}.appspot.com`);
  }

  return new Set(defaults);
};

const allowedOrigins = parseAllowedOrigins();
const appspotRDomainPattern = /^https:\/\/([a-z0-9-]+-dot-)?[a-z0-9-]+\.[a-z0-9-]+\.r\.appspot\.com$/i;
const appspotLegacyPattern = /^https:\/\/([a-z0-9-]+-dot-)?[a-z0-9-]+\.appspot\.com$/i;

const isAllowedOrigin = (origin) =>
  allowedOrigins.has(origin) || appspotRDomainPattern.test(origin) || appspotLegacyPattern.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

// Serve OpenAPI docs before helmet CSP headers to avoid Swagger UI script restrictions.
app.get('/api-docs/openapi.yaml', (req, res) => {
  res.sendFile(openApiPath);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
  });
});


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
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1000, // limit tO 100R
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl || req.url,
      user: req.user || null,
      windowMs: options.windowMs,
      limit: options.limit,
    });

    // express-rate-limit sets RFC standard RateLimit headers when standardHeaders=true.
    // Also set Retry-After to make frontend/backoff logic easier.
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.set('Retry-After', String(retryAfterSeconds));

    res.status(options.statusCode).json({
      success: false,
      message: options.message || 'Too many requests, please try again later.',
      errorCode: 'ERR_RATE_LIMIT',
      statusCode: options.statusCode,
      data: {
        retryAfterSeconds,
      },
    });
  },
});
app.use(limiter);

// Body parsing middleware - order matters!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve uploaded files statically (local dev only — on Cloud Run files are in GCS)
if (!process.env.GCS_BUCKET) {
  app.use('/uploads', express.static(uploadsRoot));
}

// Set up Routes
app.use(router);

// Express error-handling middleware
app.use((err, req, res, next) => {
  const errorResponse = errorHandler.handleError(err, { request: req, source: 'http' });
  res.status(errorResponse.statusCode || 500).json(errorResponse);
});

export default app;
