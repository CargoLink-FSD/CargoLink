import { logger } from '../utils/misc.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/misc.js';
import authService from '../services/authService.js';
import Transporter from '../models/transporter.js';

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
            // if (!req.url.startsWith('/api/chat')) {
            //     logger.debug('Auth ok', { userId, role });
            // }
            next();
        } catch (err) {
            next(err);
        }
    };
};

export const requireSignupVerification = (role) => {
    return (req, res, next) => {
        if (process.env.NODE_ENV === 'test') {
            return next();
        }

        const verificationToken = req.headers['x-signup-verification-token'];
        if (!verificationToken) {
            return next(new AppError(401, 'AuthError', 'Signup verification required. Please verify OTP first.', 'ERR_SIGNUP_TOKEN_REQUIRED'));
        }

        try {
            authService.validateSignupVerificationToken(verificationToken, req.body?.email, role);
            req.signupVerificationToken = verificationToken;
            next();
        } catch (err) {
            next(err);
        }
    };
};

export const requireVerified = async (req, res, next) => {
    try {
        if (req.user.role !== 'transporter') {
            return next();
        }
        const transporter = await Transporter.findById(req.user.id).select('isVerified verificationStatus');
        if (!transporter) {
            return next(new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND'));
        }
        if (!transporter.isVerified) {
            return next(new AppError(403, 'AuthError', 'Your account is not verified yet. Please upload your documents and wait for manager approval before placing bids.', 'ERR_NOT_VERIFIED'));
        }
        next();
    } catch (err) {
        next(err);
    }
};