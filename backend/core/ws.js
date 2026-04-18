import { WebSocketServer } from 'ws';
import { verifyAccessToken } from '../utils/jwt.js';
import authService from '../services/authService.js';
import { setUserSocketPresence } from './cache.js';
import { logger } from '../utils/misc.js';

let websocketServer = null;
const userConnections = new Map();

const getTokenFromRequest = (req) => {
  try {
    const url = new URL(req.url || '/ws', 'http://localhost');
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;

    const authHeader = req.headers?.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  } catch (err) {
    logger.warn('Failed to parse WS request URL', { error: err.message });
  }

  return null;
};

const registerConnection = async (userId, role, ws) => {
  const key = String(userId);
  if (!userConnections.has(key)) {
    userConnections.set(key, new Set());
  }
  userConnections.get(key).add(ws);
  await setUserSocketPresence(key, { connected: true, role });
};

const unregisterConnection = async (userId, ws) => {
  const key = String(userId);
  const sockets = userConnections.get(key);
  if (!sockets) return;

  sockets.delete(ws);
  if (sockets.size === 0) {
    userConnections.delete(key);
    await setUserSocketPresence(key, { connected: false });
  }
};

export const isUserConnected = (userId) => {
  if (!userId) return false;
  const sockets = userConnections.get(String(userId));
  return !!sockets && sockets.size > 0;
};

export const sendToUser = (userId, payload) => {
  const sockets = userConnections.get(String(userId));
  if (!sockets || sockets.size === 0) {
    return 0;
  }

  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let delivered = 0;

  sockets.forEach((client) => {
    if (client.readyState === 1) {
      try {
        client.send(message);
        delivered += 1;
      } catch (err) {
        logger.warn('Failed to send websocket message', { userId, error: err.message });
      }
    }
  });

  return delivered;
};

export function createWebsocketServer(server) {
  try {
    const wss = new WebSocketServer({ server, path: '/ws' });
    websocketServer = wss;

    wss.on('connection', async (ws, req) => {
      const token = getTokenFromRequest(req);
      if (!token) {
        ws.close(4401, 'Authentication token required');
        return;
      }

      let authPayload = null;
      try {
        const decoded = verifyAccessToken(token);
        authPayload = authService.validateAccessTokenPayload(decoded);
      } catch (err) {
        ws.close(4401, 'Invalid token');
        return;
      }

      const userId = String(authPayload.userId);
      const role = authPayload.role;
      ws.userId = userId;
      ws.userRole = role;

      await registerConnection(userId, role, ws);

      logger.info('WebSocket client connected', { userId, role });

      ws.send(JSON.stringify({
        type: 'ws:connected',
        data: {
          userId,
          role,
          connectedAt: new Date().toISOString(),
        },
      }));

      ws.on('message', (msg) => {
        try {
          const parsed = JSON.parse(String(msg));
          if (parsed?.type === 'ws:ping') {
            ws.send(JSON.stringify({ type: 'ws:pong', data: { ts: Date.now() } }));
            return;
          }
          logger.debug('WS message received', { userId, type: parsed?.type || 'unknown' });
        } catch {
          logger.debug('WS non-JSON message received', { userId });
        }
      });

      ws.on('close', () => {
        void unregisterConnection(userId, ws);
        logger.info('WebSocket client disconnected', { userId, role });
      });

      ws.on('error', (err) => {
        logger.warn('WebSocket client error', { userId, error: err.message });
      });
    });

    return wss;
  } catch (err) {
    logger.error('WebSocket server creation failed', { stack: err.stack });
    throw err
  }
}

export const getWebsocketServer = () => websocketServer;
