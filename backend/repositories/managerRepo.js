import Manager from '../models/manager.js';
import InvitationCode from '../models/invitationCode.js';
import ThresholdConfig from '../models/thresholdConfig.js';
import Ticket from '../models/ticket.js';

// ─── Manager CRUD ────────────────────────────────────────

const findManagerById = async (id) => {
    return Manager.findById(id);
};

const findManagerByEmail = async (email) => {
    return Manager.findOne({ email: email.toLowerCase() });
};

const createManager = async (data) => {
    const manager = new Manager(data);
    return manager.save();
};

const updateManager = async (id, updates) => {
    return Manager.findByIdAndUpdate(id, { $set: updates }, { new: true });
};

const deleteManager = async (id) => {
    return Manager.findByIdAndDelete(id);
};

const getAllManagers = async (query = {}) => {
    return Manager.find(query).sort({ createdAt: -1 });
};

const getActiveManagers = async () => {
    return Manager.find({ status: 'active' }).sort({ openTicketCount: 1 });
};

const getActiveManagersByCategory = async (category) => {
    return Manager.find({
        status: 'active',
        categories: category,
        isDefault: { $ne: true }, // Exclude default manager — used only as fallback
    }).sort({ openTicketCount: 1 }); // Least-load first
};

const incrementOpenTicketCount = async (managerId) => {
    return Manager.findByIdAndUpdate(managerId, { $inc: { openTicketCount: 1 } }, { new: true });
};

const decrementOpenTicketCount = async (managerId) => {
    return Manager.findByIdAndUpdate(
        managerId,
        { $inc: { openTicketCount: -1, totalResolved: 1 } },
        { new: true }
    );
};

const incrementVerifiedCount = async (managerId) => {
    return Manager.findByIdAndUpdate(
        managerId,
        { $inc: { totalVerified: 1 } },
        { new: true }
    );
};

const getDefaultManager = async () => {
    return Manager.findOne({ isDefault: true, status: 'active' });
};

// ─── Invitation Code CRUD ────────────────────────────────

const createInvitationCode = async (data) => {
    const code = new InvitationCode(data);
    return code.save();
};

const findInvitationByCode = async (code) => {
    return InvitationCode.findOne({ code: code.toUpperCase() });
};

const getAllInvitationCodes = async () => {
    return InvitationCode.find().populate('usedBy', 'name email').sort({ createdAt: -1 });
};

const markInvitationUsed = async (codeId, managerId) => {
    return InvitationCode.findByIdAndUpdate(
        codeId,
        { $set: { used: true, usedBy: managerId } },
        { new: true }
    );
};

// ─── Threshold Config ────────────────────────────────────

const getThresholdConfig = async (category) => {
    return ThresholdConfig.findOne({ category });
};

const getAllThresholdConfigs = async () => {
    return ThresholdConfig.find().sort({ category: 1 });
};

const upsertThresholdConfig = async (category, maxTicketsPerHour) => {
    return ThresholdConfig.findOneAndUpdate(
        { category },
        { $set: { maxTicketsPerHour, alertSent: false } },
        { upsert: true, new: true }
    );
};

const markAlertSent = async (category) => {
    return ThresholdConfig.findOneAndUpdate(
        { category },
        { $set: { alertSent: true, lastAlertAt: new Date() } },
        { new: true }
    );
};

const resetAlert = async (category) => {
    return ThresholdConfig.findOneAndUpdate(
        { category },
        { $set: { alertSent: false } },
        { new: true }
    );
};

// ─── Ticket stats for threshold checking ─────────────────

const getTicketCountByCategory = async (category, sinceDate) => {
    return Ticket.countDocuments({
        category,
        status: { $in: ['open', 'in_progress'] },
        createdAt: { $gte: sinceDate },
    });
};

const getTicketVolumeByCategory = async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return Ticket.aggregate([
        { $match: { createdAt: { $gte: oneHourAgo } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);
};

const getManagerStats = async () => {
    const managers = await Manager.find().lean();
    const totalActive = managers.filter((m) => m.status === 'active').length;
    const totalInactive = managers.filter((m) => m.status === 'inactive').length;
    const totalTicketsHandled = managers.reduce((sum, m) => sum + (m.totalResolved || 0), 0);
    const totalOpenTickets = managers.reduce((sum, m) => sum + (m.openTicketCount || 0), 0);
    return {
        total: managers.length,
        active: totalActive,
        inactive: totalInactive,
        totalTicketsHandled,
        totalOpenTickets,
    };
};

export default {
    // Manager
    findManagerById,
    findManagerByEmail,
    createManager,
    updateManager,
    deleteManager,
    getAllManagers,
    getActiveManagers,
    getActiveManagersByCategory,
    incrementOpenTicketCount,
    decrementOpenTicketCount,
    incrementVerifiedCount,
    getDefaultManager,

    // Invitation Codes
    createInvitationCode,
    findInvitationByCode,
    getAllInvitationCodes,
    markInvitationUsed,

    // Threshold
    getThresholdConfig,
    getAllThresholdConfigs,
    upsertThresholdConfig,
    markAlertSent,
    resetAlert,

    // Stats
    getTicketCountByCategory,
    getTicketVolumeByCategory,
    getManagerStats,
};
