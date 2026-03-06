import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const ManagerSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        categories: [
            {
                type: String,
                enum: [
                    'Shipment Issue',
                    'Payment Issue',
                    'Transporter Complaint',
                    'Customer Complaint',
                    'Technical Issue',
                    'Account Issue',
                    'Other',
                ],
            },
        ],
        verificationCategories: [
            {
                type: String,
                enum: [
                    'transporter_verification',
                    'driver_verification',
                    'vehicle_verification',
                ],
            },
        ],
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        openTicketCount: { type: Number, default: 0 },
        totalResolved: { type: Number, default: 0 },
        openVerificationCount: { type: Number, default: 0 },
        totalVerified: { type: Number, default: 0 },
        invitationCode: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InvitationCode',
            default: null,
        },
        isDefault: { type: Boolean, default: false }, // The default manager created at seed time
    },
    { timestamps: true }
);

// Hash password before saving
ManagerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Verify password
ManagerSchema.methods.verifyPassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Manager = mongoose.model('Manager', ManagerSchema);
export default Manager;
