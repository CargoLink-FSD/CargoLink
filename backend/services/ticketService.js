import ticketRepo from '../repositories/ticketRepo.js';
import { AppError } from '../utils/misc.js';

const createTicket = async (userId, userRole, userName, userEmail, ticketData) => {
    const userModel = userRole === 'customer' ? 'Customer' : 'Transporter';

    const ticketPayload = {
        userId,
        userModel,
        userRole,
        userName,
        userEmail,
        category: ticketData.category,
        subject: ticketData.subject,
        priority: ticketData.priority || 'medium',
        messages: [
            {
                sender: userRole,
                senderName: userName,
                text: ticketData.message,
                attachment: ticketData.attachment || null,
            },
        ],
    };

    if (ticketData.orderId) {
        ticketPayload.orderId = ticketData.orderId;
    }

    const ticket = await ticketRepo.createTicket(ticketPayload);
    return ticket;
};

const getMyTickets = async (userId) => {
    return await ticketRepo.getTicketsByUser(userId);
};

const getTicketDetail = async (ticketId, userId, userRole) => {
    const ticket = await ticketRepo.getTicketById(ticketId);
    if (!ticket) {
        throw new AppError(404, 'NotFoundError', 'Ticket not found', 'ERR_NOT_FOUND');
    }
    // Users can only see their own tickets; managers can see all
    if (userRole !== 'manager' && ticket.userId.toString() !== userId) {
        throw new AppError(403, 'ForbiddenError', 'Access denied', 'ERR_FORBIDDEN');
    }
    return ticket;
};

const addUserReply = async (ticketId, userId, userRole, userName, text) => {
    const ticket = await ticketRepo.getTicketById(ticketId);
    if (!ticket) {
        throw new AppError(404, 'NotFoundError', 'Ticket not found', 'ERR_NOT_FOUND');
    }
    if (ticket.userId.toString() !== userId) {
        throw new AppError(403, 'ForbiddenError', 'Access denied', 'ERR_FORBIDDEN');
    }
    if (ticket.status === 'closed') {
        throw new AppError(400, 'ValidationError', 'Cannot reply to a closed ticket', 'ERR_TICKET_CLOSED');
    }

    const updated = await ticketRepo.addMessage(ticketId, {
        sender: userRole,
        senderName: userName,
        text,
    });
    return updated;
};

// Manager functions
const getAllTickets = async (filters) => {
    return await ticketRepo.getAllTickets(filters);
};

const getTicketStats = async () => {
    return await ticketRepo.getTicketStats();
};

const addManagerReply = async (ticketId, text) => {
    const ticket = await ticketRepo.getTicketById(ticketId);
    if (!ticket) {
        throw new AppError(404, 'NotFoundError', 'Ticket not found', 'ERR_NOT_FOUND');
    }
    if (ticket.status === 'closed') {
        throw new AppError(400, 'ValidationError', 'Cannot reply to a closed ticket', 'ERR_TICKET_CLOSED');
    }

    // Auto-set status to in_progress if it was open
    if (ticket.status === 'open') {
        await ticketRepo.updateTicketStatus(ticketId, 'in_progress');
    }

    return await ticketRepo.addMessage(ticketId, {
        sender: 'manager',
        senderName: 'Manager',
        text,
    });
};

const updateTicketStatus = async (ticketId, status) => {
    const ticket = await ticketRepo.getTicketById(ticketId);
    if (!ticket) {
        throw new AppError(404, 'NotFoundError', 'Ticket not found', 'ERR_NOT_FOUND');
    }
    // Once closed, manager cannot change status
    if (ticket.status === 'closed') {
        throw new AppError(400, 'ValidationError', 'Closed tickets cannot be modified', 'ERR_TICKET_CLOSED');
    }
    return await ticketRepo.updateTicketStatus(ticketId, status);
};

// User can reopen a closed ticket
const reopenTicket = async (ticketId, userId) => {
    const ticket = await ticketRepo.getTicketById(ticketId);
    if (!ticket) {
        throw new AppError(404, 'NotFoundError', 'Ticket not found', 'ERR_NOT_FOUND');
    }
    if (ticket.userId.toString() !== userId) {
        throw new AppError(403, 'ForbiddenError', 'Access denied', 'ERR_FORBIDDEN');
    }
    if (ticket.status !== 'closed') {
        throw new AppError(400, 'ValidationError', 'Only closed tickets can be reopened', 'ERR_INVALID_STATUS');
    }
    return await ticketRepo.updateTicketStatus(ticketId, 'in_progress');
};

export default {
    createTicket,
    getMyTickets,
    getTicketDetail,
    addUserReply,
    getAllTickets,
    getTicketStats,
    addManagerReply,
    updateTicketStatus,
    reopenTicket,
};
