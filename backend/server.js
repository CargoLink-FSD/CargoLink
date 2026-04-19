import app from './core/app.js';
import { connectDB } from './core/db.js';
import { createWebsocketServer } from './core/ws.js';
import { closeCache, initCache } from './core/cache.js';
import { startCronJobs } from './core/cron.js';
import { logger, errorHandler } from './utils/misc.js';
import { PORT, MONGO_URI } from './core/index.js';
import managerService from './services/managerService.js';
import { initializeNotificationService } from './services/notificationService.js';
import { resolveMongoUri, loadAllSecrets } from './core/secrets.js';

const STARTUP_RETRY_DELAY_MS = 15000;

// Handle uncaught exceptions (synchronous errors outside request cycle)
process.on('uncaughtException', (err) => {
  errorHandler.handleError(err, 'uncaughtException');
});

// Handle unhandled promise rejections (async errors outside request cycle)
process.on('unhandledRejection', (reason, promise) => {
  errorHandler.handleError(reason, 'unhandledRejection');
});

// Bind the Cloud Run port immediately; initialize external dependencies in the background.
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

let bootstrapped = false;

const bootstrapDependencies = async () => {
  if (bootstrapped) return;

  try {
    // Bootstrap secrets before resolving config values that depend on env vars.
    await loadAllSecrets();

    // Cache is optional. If unavailable, API continues with DB-only behavior.
    await initCache();

    const mongoUri = await resolveMongoUri(MONGO_URI);
    await connectDB(mongoUri);

    await managerService.seedDefaultManager();

    startCronJobs();
    createWebsocketServer(server);
    initializeNotificationService();

    bootstrapped = true;
    logger.info('Dependency bootstrap completed');
  } catch (err) {
    errorHandler.handleError(err, { source: 'startup' });
    logger.warn(`Dependency bootstrap failed; retrying in ${STARTUP_RETRY_DELAY_MS}ms`);

    setTimeout(() => {
      void bootstrapDependencies();
    }, STARTUP_RETRY_DELAY_MS);
  }
};

void bootstrapDependencies();

const shutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down server...`);
  await closeCache();
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
