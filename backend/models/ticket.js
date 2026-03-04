import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
    {
        sender: {
            type: String,
            enum: ['customer', 'transporter', 'driver', 'manager'],
            required: true,
        },
        senderName: { type: String },
        text: { type: String, required: true },
        attachment: { type: String }, // optional file URL
    },
    { timestamps: true }
);

const TicketSchema = new mongoose.Schema(
    {
        ticketId: { type: String, unique: true },
        userId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'userModel' },
        userModel: { type: String, enum: ['Customer', 'Transporter', 'Driver'], required: true },
        userRole: { type: String, enum: ['customer', 'transporter', 'driver'], required: true },
        userName: { type: String, required: true },
        userEmail: { type: String, required: true },
        category: {
            type: String,
            enum: [
                'Shipment Issue',
                'Payment Issue',
                'Transporter Complaint',
                'Customer Complaint',
                'Driver Complaint',
                'Technical Issue',
                'Account Issue',
                'Other',
            ],
            required: true,
        },
        subject: { type: String, required: true },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
        },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'closed'],
            default: 'open',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        assignedManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Manager',
            default: null,
        },
        messages: [MessageSchema],
    },
    { timestamps: true }
);

// Auto-generate ticketId before save
TicketSchema.pre('save', async function (next) {
    if (this.isNew && !this.ticketId) {
        const count = await mongoose.model('Ticket').countDocuments();
        this.ticketId = `TCK${String(count + 1001).padStart(5, '0')}`;
    }
    next();
});

const Ticket = mongoose.model('Ticket', TicketSchema);
export default Ticket;
