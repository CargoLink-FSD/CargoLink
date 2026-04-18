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

// Handle uncaught exceptions (synchronous errors outside request cycle)
process.on('uncaughtException', (err) => {
  errorHandler.handleError(err, 'uncaughtException');
});

// Handle unhandled promise rejections (async errors outside request cycle)
process.on('unhandledRejection', (reason, promise) => {
  errorHandler.handleError(reason, 'unhandledRejection');
});

// Connect to DB then start server and ws
(async () => {
  try {
    // 1. Bootstrap secrets from Secret Manager first — must run before any
    //    config module reads process.env values (all imports above are fine
    //    because they only read env vars lazily when their functions are called).
    await loadAllSecrets();

    await initCache();

    // resolveMongoUri respects process.env.MONGO_URI which was just set above
    const mongoUri = await resolveMongoUri(MONGO_URI);
    await connectDB(mongoUri);

    // Seed default manager if not exists
    await managerService.seedDefaultManager();

    const server = app.listen(PORT, '0.0.0.0', () =>
      logger.info(`Server running on http://localhost:${PORT}`),
    );

    // Initialize automated jobs
    startCronJobs();

    // Initialize WebSocket server attached to the same HTTP server
    // `createWebsocketServer` now handles its own errors and returns null on failure.
    createWebsocketServer(server);
    initializeNotificationService();

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
  } catch (err) {
    errorHandler.handleError(err, 'startup');
  }
})();
