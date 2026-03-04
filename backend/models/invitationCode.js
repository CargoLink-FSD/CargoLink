import mongoose from 'mongoose';
import crypto from 'crypto';

const InvitationCodeSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            unique: true,
            required: true,
            default: () => crypto.randomBytes(6).toString('hex').toUpperCase(), // 12-char hex code
        },
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
        createdBy: { type: String, default: 'admin' }, // admin id
        expiresAt: { type: Date, required: true },
        used: { type: Boolean, default: false },
        usedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Manager',
            default: null,
        },
    },
    { timestamps: true }
);

// Index for quick lookup of valid codes
InvitationCodeSchema.index({ code: 1, used: 1, expiresAt: 1 });

// Check if the code is still valid
InvitationCodeSchema.methods.isValid = function () {
    return !this.used && new Date() < this.expiresAt;
};

const InvitationCode = mongoose.model('InvitationCode', InvitationCodeSchema);
export default InvitationCode;
