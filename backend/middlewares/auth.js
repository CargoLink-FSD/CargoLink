import { logger } from '../utils/misc.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/misc.js';
import authService from '../services/authService.js';

export const authMiddleware = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'] || '';
        if (!authHeader.startsWith('Bearer ')) {
            return next(new AppError(401, 'AuthError', 'Missing Bearer token', 'ERR_NO_TOKEN'));
        }
        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (err) {
            return next(new AppError(401, 'AuthError', 'Invalid or expired token', 'ERR_TOKEN_INVALID'));
        }
        try {
            const { userId, role } = authService.validateAccessTokenPayload(decoded, roles);
            req.user = { id: userId, role };
            logger.debug('Auth ok', { userId, role });
            next();
        } catch (err) {
            next(err);
        }
    };
};