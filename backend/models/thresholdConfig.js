import mongoose from 'mongoose';

const ThresholdConfigSchema = new mongoose.Schema(
    {
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
            unique: true,
        },
        maxTicketsPerHour: { type: Number, default: 10 },
        alertSent: { type: Boolean, default: false },
        lastAlertAt: { type: Date, default: null },
    },
    { timestamps: true }
);

const ThresholdConfig = mongoose.model('ThresholdConfig', ThresholdConfigSchema);
export default ThresholdConfig;
