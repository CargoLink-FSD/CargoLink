import app from './core/app.js';
import { connectDB } from './core/db.js';
import { createWebsocketServer } from './core/ws.js';
import { closeCache, initCache } from './core/cache.js';
import { logger, errorHandler } from './utils/misc.js';
import { PORT, MONGO_URI } from './core/index.js';
import managerService from './services/managerService.js';

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
    await initCache();
    await connectDB(MONGO_URI);

    // Seed default manager if not exists
    await managerService.seedDefaultManager();

    const server = app.listen(PORT, '0.0.0.0', () =>
      logger.info(`Server running on http://localhost:${PORT}`),
    );

    // Initialize WebSocket server attached to the same HTTP server
    // `createWebsocketServer` now handles its own errors and returns null on failure.
    createWebsocketServer(server);

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
