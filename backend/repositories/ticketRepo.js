import Ticket from '../models/ticket.js';

const createTicket = async (data) => {
    const ticket = new Ticket(data);
    return await ticket.save();
};

const getTicketsByUser = async (userId) => {
    return await Ticket.find({ userId }).sort({ createdAt: -1 });
};

const getTicketById = async (ticketId) => {
    return await Ticket.findById(ticketId);
};

const getTicketByTicketId = async (ticketId) => {
    return await Ticket.findOne({ ticketId });
};

const getAllTickets = async (filters = {}) => {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.userRole) query.userRole = filters.userRole;
    if (filters.priority) query.priority = filters.priority;
    return await Ticket.find(query).sort({ createdAt: -1 });
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
