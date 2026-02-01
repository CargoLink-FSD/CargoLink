import app from './core/app.js';
import { connectDB } from './core/db.js';
import { createWebsocketServer } from './core/ws.js';
import { startScheduler } from './core/scheduler.js';
import { logger, errorHandler } from './utils/misc.js';
import { PORT, MONGO_URI } from './core/index.js';

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
    await connectDB(MONGO_URI);

    const server = app.listen(PORT, '0.0.0.0', () =>
      logger.info(`Server running on http://localhost:${PORT}`),
    );

    // Initialize WebSocket server attached to the same HTTP server
    // `createWebsocketServer` now handles its own errors and returns null on failure.
    createWebsocketServer(server);
    
    // Start the order expiry scheduler
    startScheduler();
  } catch (err) {
    errorHandler.handleError(err, 'startup');
  }
})();
