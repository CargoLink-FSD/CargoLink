import Ticket from '../models/ticket.js';
import { parsePaginationParams } from '../utils/misc.js';

const createTicket = async (data) => {
    const ticket = new Ticket(data);
    return await ticket.save();
};

const getTicketsByUser = async (userId, { page, limit } = {}) => {
    const query = { userId };
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 10, maxLimit: 100 });
    const findQuery = Ticket.find(query).sort({ createdAt: -1 });

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Ticket.countDocuments(query),
        ]);

        return {
            items,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1,
            },
        };
    }

    return await findQuery.lean();
};

const getTicketById = async (ticketId) => {
    return await Ticket.findById(ticketId);
};

const getTicketByTicketId = async (ticketId) => {
    return await Ticket.findOne({ ticketId });
};

const getAllTickets = async (filters = {}, options = {}) => {
    const query = {};
    const pagination = parsePaginationParams(options, { defaultLimit: 20, maxLimit: 100 });

    if (filters.status) query.status = filters.status;
    if (filters.userRole) query.userRole = filters.userRole;
    if (filters.priority) query.priority = filters.priority;
    if (filters.assignedManager) query.assignedManager = filters.assignedManager;

    const findQuery = Ticket.find(query).sort({ createdAt: -1 });

    if (pagination) {
        const [items, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Ticket.countDocuments(query),
        ]);

        return {
            items,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total,
                totalPages: Math.ceil(total / pagination.limit) || 1,
            },
        };
    }

    return await findQuery.lean();
};

const addMessage = async (ticketId, message) => {
    return await Ticket.findByIdAndUpdate(
        ticketId,
        { $push: { messages: message } },
        { new: true }
    );
};

const updateTicketStatus = async (ticketId, status) => {
    return await Ticket.findByIdAndUpdate(
        ticketId,
        { $set: { status } },
        { new: true }
    );
};

const getTicketStats = async () => {
    const [open, inProgress, closed] = await Promise.all([
        Ticket.countDocuments({ status: 'open' }),
        Ticket.countDocuments({ status: 'in_progress' }),
        Ticket.countDocuments({ status: 'closed' }),
    ]);
    return { open, inProgress, closed, total: open + inProgress + closed };
};

export default {
    createTicket,
    getTicketsByUser,
    getTicketById,
    getTicketByTicketId,
    getAllTickets,
    addMessage,
    updateTicketStatus,
    getTicketStats,
};
