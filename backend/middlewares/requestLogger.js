import { logger } from "../utils/misc.js"

export const requestLogger = (req, res, next) => {
  if(req.method === 'OPTIONS' || req.url.startsWith('/api/chat')) {
    return next();
  }
  logger.info(`Request: ${req.method} ${req.url} { ip: ${req.ip} }`);
  next();
};