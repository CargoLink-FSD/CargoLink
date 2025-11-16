import { logger } from "../utils/misc.js"

export const requestLogger = (req, res, next) => {
  logger.info(`Request: ${req.method} ${req.url} { ip: ${req.ip} }`);
  next();
};