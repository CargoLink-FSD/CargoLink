import transporterRepo from "../repositories/transporterRepo.js";
import { AppError, logger } from "../utils/misc.js";

const getVerificationQueue = async () => {
  const transporters = await transporterRepo.getTransportersForVerification();
  return transporters;
};

const approveDocument = async (transporterId, docType) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  if (!transporter.documents) {
    throw new AppError(400, 'ValidationError', 'No documents found for this transporter', 'ERR_NO_DOCS');
  }

  // Determine the document path based on docType
  let docPath;
  if (docType === 'pan_card') {
    docPath = 'documents.pan_card';
  } else if (docType === 'driving_license') {
    docPath = 'documents.driving_license';
  } else if (docType.startsWith('vehicle_rc_')) {
    const index = parseInt(docType.split('_')[2], 10);
    if (isNaN(index) || !transporter.documents.vehicle_rcs || index >= transporter.documents.vehicle_rcs.length) {
      throw new AppError(400, 'ValidationError', 'Invalid vehicle RC index', 'ERR_INVALID_DOC');
    }
    docPath = `documents.vehicle_rcs.${index}`;
  } else {
    throw new AppError(400, 'ValidationError', 'Invalid document type', 'ERR_INVALID_DOC_TYPE');
  }

  await transporterRepo.updateDocumentStatus(transporterId, docPath, 'approved', null);

  // If it was a vehicle RC, sync the fleet item's rc_status
  if (docType.startsWith('vehicle_rc_')) {
    const index = parseInt(docType.split('_')[2], 10);
    const t = await transporterRepo.findTransporterById(transporterId);
    const rcDoc = t.documents?.vehicle_rcs?.[index];
    if (rcDoc?.vehicleId) {
      await transporterRepo.updateFleetRcStatus(transporterId, rcDoc.vehicleId.toString(), 'approved');
    }
  }

  // Check if all documents are now approved
  const updated = await transporterRepo.findTransporterById(transporterId);
  const docs = updated.documents;
  const allApproved = checkAllDocumentsApproved(docs);

  if (allApproved) {
    await transporterRepo.updateVerificationStatus(transporterId, 'approved', true);
    logger.info(`Transporter ${transporterId} fully verified — all documents approved`);
  }

  return await transporterRepo.findTransporterById(transporterId);
};

const rejectDocument = async (transporterId, docType, note) => {
  const transporter = await transporterRepo.findTransporterById(transporterId);
  if (!transporter) {
    throw new AppError(404, 'NotFoundError', 'Transporter not found', 'ERR_NOT_FOUND');
  }

  if (!transporter.documents) {
    throw new AppError(400, 'ValidationError', 'No documents found for this transporter', 'ERR_NO_DOCS');
  }

  let docPath;
  if (docType === 'pan_card') {
    docPath = 'documents.pan_card';
  } else if (docType === 'driving_license') {
    docPath = 'documents.driving_license';
  } else if (docType.startsWith('vehicle_rc_')) {
    const index = parseInt(docType.split('_')[2], 10);
    if (isNaN(index) || !transporter.documents.vehicle_rcs || index >= transporter.documents.vehicle_rcs.length) {
      throw new AppError(400, 'ValidationError', 'Invalid vehicle RC index', 'ERR_INVALID_DOC');
    }
    docPath = `documents.vehicle_rcs.${index}`;
  } else {
    throw new AppError(400, 'ValidationError', 'Invalid document type', 'ERR_INVALID_DOC_TYPE');
  }

  await transporterRepo.updateDocumentStatus(transporterId, docPath, 'rejected', note || 'Document rejected by manager');

  // If it was a vehicle RC, sync the fleet item's rc_status
  if (docType.startsWith('vehicle_rc_')) {
    const index = parseInt(docType.split('_')[2], 10);
    const t = await transporterRepo.findTransporterById(transporterId);
    const rcDoc = t.documents?.vehicle_rcs?.[index];
    if (rcDoc?.vehicleId) {
      await transporterRepo.updateFleetRcStatus(transporterId, rcDoc.vehicleId.toString(), 'rejected', note || 'Document rejected by manager');
    }
  }

  await transporterRepo.updateVerificationStatus(transporterId, 'rejected', false);

  return await transporterRepo.findTransporterById(transporterId);
};

function checkAllDocumentsApproved(docs) {
  if (!docs) return false;

  // Check pan_card
  if (!docs.pan_card || docs.pan_card.adminStatus !== 'approved') return false;

  // Check driving_license
  if (!docs.driving_license || docs.driving_license.adminStatus !== 'approved') return false;

  // Check all vehicle_rcs
  if (!docs.vehicle_rcs || docs.vehicle_rcs.length === 0) return false;
  for (const rc of docs.vehicle_rcs) {
    if (rc.adminStatus !== 'approved') return false;
  }

  return true;
}

export default {
  getVerificationQueue,
  approveDocument,
  rejectDocument,
};
