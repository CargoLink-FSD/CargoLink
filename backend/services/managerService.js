import managerRepo from '../repositories/managerRepo.js';
import transporterRepo from '../repositories/transporterRepo.js';
import driverRepo from '../repositories/driverRepo.js';
import { AppError, logger, sendMail } from '../utils/misc.js';

// ─── Verification Queue (combined: transporters + drivers) ─────────

const getVerificationQueue = async (managerId = null) => {
    const transporters = await transporterRepo.getTransportersForVerification();
    const drivers = await driverRepo.getDriversForVerification();

    // Format into a unified list
    const queue = [];

    for (const t of transporters) {
        const docs = t.documents || {};
        // Add PAN card + DL as transporter_verification items
        if (docs.pan_card) {
            queue.push({
                _id: t._id,
                entityType: 'transporter',
                verificationType: 'transporter_verification',
                name: t.name,
                email: t.email,
                docType: 'pan_card',
                docLabel: 'PAN Card',
                url: docs.pan_card.url,
                uploadedAt: docs.pan_card.uploadedAt,
                status: docs.pan_card.adminStatus,
                note: docs.pan_card.adminNote,
                refData: [
                    t.pan && { label: 'PAN Number', value: t.pan },
                    t.gst_in && { label: 'GST', value: t.gst_in },
                    t.primary_contact && { label: 'Contact', value: t.primary_contact },
                ].filter(Boolean),
            });
        }
        if (docs.driving_license) {
            queue.push({
                _id: t._id,
                entityType: 'transporter',
                verificationType: 'transporter_verification',
                name: t.name,
                email: t.email,
                docType: 'driving_license',
                docLabel: 'Driving License',
                url: docs.driving_license.url,
                uploadedAt: docs.driving_license.uploadedAt,
                status: docs.driving_license.adminStatus,
                note: docs.driving_license.adminNote,
                refData: [
                    { label: 'Name', value: t.name },
                    t.primary_contact && { label: 'Contact', value: t.primary_contact },
                ].filter(Boolean),
            });
        }
        // Vehicle RCs
        if (docs.vehicle_rcs && docs.vehicle_rcs.length > 0) {
            docs.vehicle_rcs.forEach((rc, index) => {
                const vehicle = t.fleet?.find(v => v._id?.toString() === rc.vehicleId?.toString());
                queue.push({
                    _id: t._id,
                    entityType: 'transporter',
                    verificationType: 'vehicle_verification',
                    name: t.name,
                    email: t.email,
                    docType: `vehicle_rc_${index}`,
                    docLabel: vehicle ? `Vehicle RC — ${vehicle.name || ''} (${vehicle.registration || ''})` : `Vehicle RC #${index + 1}`,
                    url: rc.url,
                    uploadedAt: rc.uploadedAt,
                    status: rc.adminStatus,
                    note: rc.adminNote,
                    vehicleId: rc.vehicleId,
                    refData: vehicle ? [
                        { label: 'Registration', value: vehicle.registration },
                        { label: 'Type', value: vehicle.truck_type },
                        vehicle.capacity && { label: 'Capacity', value: `${vehicle.capacity} kg` },
                    ].filter(Boolean) : [],
                });
            });
        }
    }

    for (const d of drivers) {
        const docs = d.documents || {};
        if (docs.pan_card) {
            queue.push({
                _id: d._id,
                entityType: 'driver',
                verificationType: 'driver_verification',
                name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
                email: d.email,
                docType: 'pan_card',
                docLabel: 'PAN Card',
                url: docs.pan_card.url,
                uploadedAt: docs.pan_card.uploadedAt,
                status: docs.pan_card.adminStatus,
                note: docs.pan_card.adminNote,
                refData: [
                    d.phone && { label: 'Phone', value: d.phone },
                    d.licenseNumber && { label: 'License', value: d.licenseNumber },
                ].filter(Boolean),
            });
        }
        if (docs.driving_license) {
            queue.push({
                _id: d._id,
                entityType: 'driver',
                verificationType: 'driver_verification',
                name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
                email: d.email,
                docType: 'driving_license',
                docLabel: 'Driving License',
                url: docs.driving_license.url,
                uploadedAt: docs.driving_license.uploadedAt,
                status: docs.driving_license.adminStatus,
                note: docs.driving_license.adminNote,
                refData: [
                    d.licenseNumber && { label: 'License #', value: d.licenseNumber },
                    d.phone && { label: 'Phone', value: d.phone },
                    (d.city || d.state) && { label: 'Location', value: [d.city, d.state].filter(Boolean).join(', ') },
                ].filter(Boolean),
            });
        }
    }

    // Sort: pending first, then by uploadedAt ascending (oldest first)
    queue.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(a.uploadedAt) - new Date(b.uploadedAt);
    });

    // If managerId provided, filter by manager's verification categories
    if (managerId) {
        const manager = await managerRepo.findManagerById(managerId);
        if (manager && !manager.isDefault) {
            const allowedTypes = manager.verificationCategories || [];
            if (allowedTypes.length > 0) {
                return queue.filter(item => allowedTypes.includes(item.verificationType));
            }
        }
    }

    return queue;
};

// Keep the old raw transporter queue for backward compatibility
const getRawTransporterQueue = async () => {
    return await transporterRepo.getTransportersForVerification();
};

const approveDocument = async (entityId, entityType, docType, managerId = null) => {
    let result;
    if (entityType === 'driver') {
        result = await approveDriverDocument(entityId, docType);
    } else {
        // Default: transporter
        result = await approveTransporterDocument(entityId, docType);
    }

    // Track verification activity for the manager
    if (managerId) {
        await managerRepo.incrementVerifiedCount(managerId);
    }

    return result;
};

const rejectDocument = async (entityId, entityType, docType, note, managerId = null) => {
    let result;
    if (entityType === 'driver') {
        result = await rejectDriverDocument(entityId, docType, note);
    } else {
        // Default: transporter
        result = await rejectTransporterDocument(entityId, docType, note);
    }

    // Track verification activity for the manager
    if (managerId) {
        await managerRepo.incrementVerifiedCount(managerId);
    }

    return result;
};

// ─── Transporter Document Approval ───────────────────────

const approveTransporterDocument = async (transporterId, docType) => {
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

    await transporterRepo.updateDocumentStatus(transporterId, docPath, 'approved', null);

    if (docType.startsWith('vehicle_rc_')) {
        const index = parseInt(docType.split('_')[2], 10);
        const t = await transporterRepo.findTransporterById(transporterId);
        const rcDoc = t.documents?.vehicle_rcs?.[index];
        if (rcDoc?.vehicleId) {
            await transporterRepo.updateFleetRcStatus(transporterId, rcDoc.vehicleId.toString(), 'approved');
        }
    }

    const updated = await transporterRepo.findTransporterById(transporterId);
    const docs = updated.documents;
    const allApproved = checkAllDocumentsApproved(docs);

    if (allApproved) {
        await transporterRepo.updateVerificationStatus(transporterId, 'approved', true);
        logger.info(`Transporter ${transporterId} fully verified — all documents approved`);
    }

    return await transporterRepo.findTransporterById(transporterId);
};

const rejectTransporterDocument = async (transporterId, docType, note) => {
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
    if (!docs.pan_card || docs.pan_card.adminStatus !== 'approved') return false;
    if (!docs.driving_license || docs.driving_license.adminStatus !== 'approved') return false;
    if (!docs.vehicle_rcs || docs.vehicle_rcs.length === 0) return false;
    for (const rc of docs.vehicle_rcs) {
        if (rc.adminStatus !== 'approved') return false;
    }
    return true;
}

function checkDriverDocumentsApproved(docs) {
    if (!docs) return false;
    if (!docs.pan_card || docs.pan_card.adminStatus !== 'approved') return false;
    if (!docs.driving_license || docs.driving_license.adminStatus !== 'approved') return false;
    return true;
}

// ─── Driver Document Approval ────────────────────────────

const approveDriverDocument = async (driverId, docType) => {
    const driver = await driverRepo.findDriverById(driverId);
    if (!driver) {
        throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
    }
    if (!driver.documents) {
        throw new AppError(400, 'ValidationError', 'No documents found for this driver', 'ERR_NO_DOCS');
    }

    let docPath;
    if (docType === 'pan_card') {
        docPath = 'documents.pan_card';
    } else if (docType === 'driving_license') {
        docPath = 'documents.driving_license';
    } else {
        throw new AppError(400, 'ValidationError', 'Invalid document type for driver', 'ERR_INVALID_DOC_TYPE');
    }

    await driverRepo.updateDocumentStatus(driverId, docPath, 'approved', null);

    const updated = await driverRepo.findDriverById(driverId);
    if (checkDriverDocumentsApproved(updated.documents)) {
        await driverRepo.updateVerificationStatus(driverId, 'approved', true);
        logger.info(`Driver ${driverId} fully verified — all documents approved`);
    }

    return { entityType: 'driver', _id: updated._id, verificationStatus: updated.verificationStatus, isVerified: updated.isVerified, documents: updated.documents };
};

const rejectDriverDocument = async (driverId, docType, note) => {
    const driver = await driverRepo.findDriverById(driverId);
    if (!driver) {
        throw new AppError(404, 'NotFoundError', 'Driver not found', 'ERR_NOT_FOUND');
    }
    if (!driver.documents) {
        throw new AppError(400, 'ValidationError', 'No documents found for this driver', 'ERR_NO_DOCS');
    }

    let docPath;
    if (docType === 'pan_card') {
        docPath = 'documents.pan_card';
    } else if (docType === 'driving_license') {
        docPath = 'documents.driving_license';
    } else {
        throw new AppError(400, 'ValidationError', 'Invalid document type for driver', 'ERR_INVALID_DOC_TYPE');
    }

    await driverRepo.updateDocumentStatus(driverId, docPath, 'rejected', note || 'Document rejected by manager');
    await driverRepo.updateVerificationStatus(driverId, 'rejected', false);

    const updated = await driverRepo.findDriverById(driverId);
    return { entityType: 'driver', _id: updated._id, verificationStatus: updated.verificationStatus, isVerified: updated.isVerified, documents: updated.documents };
};

// ─── Manager Registration via Invitation Code ────────────

const registerManager = async ({ name, email, password, invitationCode }) => {
    const invitation = await managerRepo.findInvitationByCode(invitationCode);
    if (!invitation) {
        throw new AppError(400, 'ValidationError', 'Invalid invitation code', 'ERR_INVALID_CODE');
    }
    if (!invitation.isValid()) {
        throw new AppError(400, 'ValidationError', 'Invitation code has expired or already been used', 'ERR_CODE_EXPIRED');
    }

    const existing = await managerRepo.findManagerByEmail(email);
    if (existing) {
        throw new AppError(409, 'DuplicateKey', 'A manager with this email already exists', 'ERR_DUPLICATE_EMAIL');
    }

    const manager = await managerRepo.createManager({
        name,
        email,
        password,
        categories: invitation.categories,
        verificationCategories: invitation.verificationCategories || [],
        invitationCode: invitation._id,
        isDefault: false,
    });

    await managerRepo.markInvitationUsed(invitation._id, manager._id);

    logger.info(`New manager registered: ${email} for categories: ${invitation.categories.join(', ')}`);

    return manager;
};

// ─── Ticket Assignment Engine (Least-Load) ───────────────

const assignTicketToManager = async (ticket) => {
    const category = ticket.category;

    // 1. Find active managers for this category (sorted by least open tickets)
    let managers = await managerRepo.getActiveManagersByCategory(category);

    // 2. If no specialized manager, use the default manager
    if (!managers || managers.length === 0) {
        const defaultManager = await managerRepo.getDefaultManager();
        if (defaultManager) {
            managers = [defaultManager];
        }
    }

    // 3. If still no manager found, return null (unassigned)
    if (!managers || managers.length === 0) {
        logger.warn(`No manager available for category: ${category}`);
        return null;
    }

    // 4. Pick manager with least open tickets (already sorted by openTicketCount asc)
    const selectedManager = managers[0];

    // 5. Increment their open ticket count
    await managerRepo.incrementOpenTicketCount(selectedManager._id);

    logger.info(`Ticket assigned to manager ${selectedManager.name} (${selectedManager.email}) for category: ${category}`);

    return selectedManager._id;
};

// ─── Threshold Check & Alert ─────────────────────────────

const checkThresholdAndAlert = async (category) => {
    const config = await managerRepo.getThresholdConfig(category);
    if (!config) return null;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await managerRepo.getTicketCountByCategory(category, oneHourAgo);

    if (recentCount >= config.maxTicketsPerHour && !config.alertSent) {
        const alertData = {
            category,
            ticketCount: recentCount,
            threshold: config.maxTicketsPerHour,
            message: `⚠️ Alert: ${recentCount} tickets in category "${category}" in the last hour (threshold: ${config.maxTicketsPerHour}). Consider adding a new manager for this category.`,
        };

        await managerRepo.markAlertSent(category);

        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@cargolink.com';
            await sendMail(
                adminEmail,
                `[CargoLink Alert] High ticket volume — ${category}`,
                alertData.message
            );
            logger.info(`Threshold alert sent to admin for category: ${category}`);
        } catch (err) {
            logger.error(`Failed to send threshold alert email: ${err.message}`);
        }

        return alertData;
    }

    return null;
};

// ─── Handle ticket status changes ────────────────────────

const handleTicketClosed = async (managerId) => {
    if (managerId) {
        await managerRepo.decrementOpenTicketCount(managerId);
    }
};

// ─── Get tickets for a specific manager ──────────────────

const getManagerTickets = async (managerId, filters = {}) => {
    const Ticket = (await import('../models/ticket.js')).default;
    const query = { assignedManager: managerId };
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    return Ticket.find(query).sort({ createdAt: -1 });
};

const getManagerTicketStats = async (managerId) => {
    const Ticket = (await import('../models/ticket.js')).default;
    const [open, inProgress, closed] = await Promise.all([
        Ticket.countDocuments({ assignedManager: managerId, status: 'open' }),
        Ticket.countDocuments({ assignedManager: managerId, status: 'in_progress' }),
        Ticket.countDocuments({ assignedManager: managerId, status: 'closed' }),
    ]);
    return { open, inProgress, closed, total: open + inProgress + closed };
};

// ─── Get manager profile ─────────────────────────────────

const getManagerProfile = async (managerId) => {
    const manager = await managerRepo.findManagerById(managerId);
    if (!manager) {
        throw new AppError(404, 'NotFoundError', 'Manager not found', 'ERR_NOT_FOUND');
    }
    return {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        categories: manager.categories,
        verificationCategories: manager.verificationCategories,
        status: manager.status,
        openTicketCount: manager.openTicketCount,
        totalResolved: manager.totalResolved,
        openVerificationCount: manager.openVerificationCount,
        totalVerified: manager.totalVerified,
        isDefault: manager.isDefault,
        createdAt: manager.createdAt,
    };
};

// ─── Seed default manager ────────────────────────────────

const seedDefaultManager = async () => {
    const existing = await managerRepo.findManagerByEmail('manager@cargolink.com');
    if (existing) {
        logger.info('Default manager already exists');
        return existing;
    }

    const defaultCategories = [
        'Shipment Issue',
        'Payment Issue',
        'Transporter Complaint',
        'Customer Complaint',
        'Driver Complaint',
        'Technical Issue',
        'Account Issue',
        'Other',
    ];

    const defaultVerificationCategories = [
        'transporter_verification',
        'driver_verification',
        'vehicle_verification',
    ];

    const manager = await managerRepo.createManager({
        name: 'Default Manager',
        email: 'manager@cargolink.com',
        password: 'manager@123',
        categories: defaultCategories,
        verificationCategories: defaultVerificationCategories,
        isDefault: true,
        status: 'active',
    });

    // Seed default threshold configs
    for (const cat of defaultCategories) {
        await managerRepo.upsertThresholdConfig(cat, 10);
    }

    logger.info('Default manager seeded: manager@cargolink.com');
    return manager;
};

export default {
    // Verification (unified queue)
    getVerificationQueue,
    getRawTransporterQueue,
    approveDocument,
    rejectDocument,

    // Manager registration
    registerManager,

    // Ticket assignment
    assignTicketToManager,
    checkThresholdAndAlert,
    handleTicketClosed,

    // Manager ticket operations
    getManagerTickets,
    getManagerTicketStats,
    getManagerProfile,

    // Seeding
    seedDefaultManager,
};
