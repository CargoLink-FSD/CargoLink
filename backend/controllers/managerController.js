import managerService from "../services/managerService.js";
import { AppError } from "../utils/misc.js";

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
  getVerificationQueue,
  approveDocument,
  rejectDocument,
};
