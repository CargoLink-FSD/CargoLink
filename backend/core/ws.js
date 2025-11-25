import { WebSocketServer } from 'ws';
import { logger } from '../utils/misc.js';

export function createWebsocketServer(server) {
  try {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      logger.info('WebSocket client connected');

      ws.on('message', (msg) => {
        logger.debug(`WS message: ${msg}`);
        // Simple echo behavior for now
        try {
          ws.send(`echo: ${msg}`);
        } catch (e) {
          logger.error('Failed to send WS message', { stack: e.stack });
        }
      });

      ws.on('close', () => logger.info('WebSocket client disconnected'));
    });

    return wss;
  } catch (err) {
    logger.error('WebSocket server creation failed', { stack: err.stack });
    throw err
    
  }
}
