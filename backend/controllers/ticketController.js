import ticketService from '../services/ticketService.js';
import Customer from '../models/customer.js';
import Transporter from '../models/transporter.js';
import Order from '../models/order.js';
import Manager from '../models/manager.js';

// ─── User endpoints (customer / transporter) ────────────────

const createTicket = async (req, res, next) => {
    try {
        const { id: userId, role } = req.user;
        let userName, userEmail;

        if (role === 'customer') {
            const c = await Customer.findById(userId).select('name email');
            userName = c?.name || 'Customer';
            userEmail = c?.email || '';
        } else {
            const t = await Transporter.findById(userId).select('name email');
            userName = t?.name || 'Transporter';
            userEmail = t?.email || '';
        }

        const ticketData = { ...req.body };

        // Handle photo attachment from multer
        if (req.file) {
            ticketData.attachment = `/uploads/ticket-attachments/${req.file.filename}`;
        }

        const ticket = await ticketService.createTicket(userId, role, userName, userEmail, ticketData);
        res.status(201).json({ success: true, data: ticket, message: 'Ticket created successfully' });
    } catch (err) {
        next(err);
    }
};

const getMyTickets = async (req, res, next) => {
    try {
        const tickets = await ticketService.getMyTickets(req.user.id);
        res.status(200).json({ success: true, data: tickets });
    } catch (err) {
        next(err);
    }
};

const getTicketDetail = async (req, res, next) => {
    try {
        const ticket = await ticketService.getTicketDetail(req.params.id, req.user.id, req.user.role);
        res.status(200).json({ success: true, data: ticket });
    } catch (err) {
        next(err);
    }
};

const addReply = async (req, res, next) => {
    try {
        const { id: userId, role } = req.user;
        let userName;

        if (role === 'customer') {
            const c = await Customer.findById(userId).select('name');
            userName = c?.name || 'Customer';
        } else {
            const t = await Transporter.findById(userId).select('name');
            userName = t?.name || 'Transporter';
        }

        const ticket = await ticketService.addUserReply(req.params.id, userId, role, userName, req.body.text);
        res.status(200).json({ success: true, data: ticket, message: 'Reply added' });
    } catch (err) {
        next(err);
    }
};

// ─── Manager endpoints ──────────────────────────────────────

const getAllTickets = async (req, res, next) => {
    try {
        const filters = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.userRole) filters.userRole = req.query.userRole;
        if (req.query.priority) filters.priority = req.query.priority;

        // Pass the logged-in manager's ID so they only see their assigned tickets
        const managerId = req.user.id;
        const tickets = await ticketService.getAllTickets(filters, managerId);
        res.status(200).json({ success: true, data: tickets });
    } catch (err) {
        next(err);
    }
};

const getTicketStats = async (req, res, next) => {
    try {
        const managerId = req.user.id;
        const stats = await ticketService.getTicketStats(managerId);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        next(err);
    }
};

const managerGetTicket = async (req, res, next) => {
    try {
        const ticket = await ticketService.getTicketDetail(req.params.id, null, 'manager');
        const ticketObj = ticket.toObject ? ticket.toObject() : { ...ticket };

        // Populate order details if orderId exists
        if (ticketObj.orderId) {
            const order = await Order.findById(ticketObj.orderId)
                .populate('customer_id', 'name email phone')
                .populate('assigned_transporter_id', 'name email primary_contact');
            if (order) {
                ticketObj.orderDetails = {
                    _id: order._id,
                    pickup: order.pickup,
                    delivery: order.delivery,
                    status: order.status,
                    goods_type: order.goods_type,
                    weight: order.weight,
                    truck_type: order.truck_type,
                    max_price: order.max_price,
                    final_price: order.final_price,
                    scheduled_at: order.scheduled_at,
                    customer: order.customer_id
                        ? { name: order.customer_id.name, email: order.customer_id.email, phone: order.customer_id.phone }
                        : null,
                    transporter: order.assigned_transporter_id
                        ? { name: order.assigned_transporter_id.name, email: order.assigned_transporter_id.email, contact: order.assigned_transporter_id.primary_contact }
                        : null,
                };
            }
        }

        res.status(200).json({ success: true, data: ticketObj });
    } catch (err) {
        next(err);
    }
};

const managerReply = async (req, res, next) => {
    try {
        // Get manager name from DB
        const manager = await Manager.findById(req.user.id).select('name');
        const managerName = manager?.name || 'Manager';

        const ticket = await ticketService.addManagerReply(req.params.id, req.body.text, managerName);
        res.status(200).json({ success: true, data: ticket, message: 'Reply sent' });
    } catch (err) {
        next(err);
    }
};

const managerUpdateStatus = async (req, res, next) => {
    try {
        const ticket = await ticketService.updateTicketStatus(req.params.id, req.body.status);
        res.status(200).json({ success: true, data: ticket, message: 'Status updated' });
    } catch (err) {
        next(err);
    }
};

const reopenTicket = async (req, res, next) => {
    try {
        const ticket = await ticketService.reopenTicket(req.params.id, req.user.id);
        res.status(200).json({ success: true, data: ticket, message: 'Ticket reopened' });
    } catch (err) {
        next(err);
    }
};

export default {
    createTicket,
    getMyTickets,
    getTicketDetail,
    addReply,
    reopenTicket,
    getAllTickets,
    getTicketStats,
    managerGetTicket,
    managerReply,
    managerUpdateStatus,
};
