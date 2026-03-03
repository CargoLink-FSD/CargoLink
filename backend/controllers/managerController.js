import managerService from "../services/managerService.js";
import authService from "../services/authService.js";
import { AppError } from "../utils/misc.js";

// ─── Registration via Invitation Code ────────────────────

const register = async (req, res, next) => {
  try {
    const { name, email, password, invitationCode } = req.body;
    if (!name || !email || !password || !invitationCode) {
      throw new AppError(400, 'ValidationError', 'Name, email, password and invitation code are required', 'ERR_MISSING_FIELDS');
    }

    const manager = await managerService.registerManager({ name, email, password, invitationCode });

    // Auto-login after registration
    const { accessToken, refreshToken } = authService.generateTokens(
      { _id: manager._id, email: manager.email, name: manager.name },
      'manager'
    );

    res.status(201).json({
      success: true,
      data: { accessToken, refreshToken },
      message: 'Manager registered successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Manager Profile ─────────────────────────────────────

const getProfile = async (req, res, next) => {
  try {
    const profile = await managerService.getManagerProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: profile,
      message: 'Profile fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ─── Verification Queue (existing) ──────────────────────

const getVerificationQueue = async (req, res, next) => {
  try {
    const transporters = await managerService.getVerificationQueue();
    res.status(200).json({
      success: true,
      data: transporters,
      message: 'Verification queue fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

const approveDocument = async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const transporter = await managerService.approveDocument(id, docType);
    res.status(200).json({
      success: true,
      data: {
        verificationStatus: transporter.verificationStatus,
        isVerified: transporter.isVerified,
        documents: transporter.documents,
      },
      message: 'Document approved successfully',
    });
  } catch (err) {
    next(err);
  }
};

const rejectDocument = async (req, res, next) => {
  try {
    const { id, docType } = req.params;
    const { note } = req.body;

    if (!note || !note.trim()) {
      throw new AppError(400, 'ValidationError', 'Rejection reason is required', 'ERR_MISSING_NOTE');
    }

    const transporter = await managerService.rejectDocument(id, docType, note);
    res.status(200).json({
      success: true,
      data: {
        verificationStatus: transporter.verificationStatus,
        isVerified: transporter.isVerified,
        documents: transporter.documents,
      },
      message: 'Document rejected successfully',
    });
  } catch (err) {
    next(err);
  }
};

export default {
  register,
  getProfile,
  getVerificationQueue,
  approveDocument,
  rejectDocument,
};
