import mongoose from 'mongoose';

const CancellationLedgerSchema = new mongoose.Schema(
    {
        actor_type: {
            type: String,
            enum: ['customer', 'transporter'],
            required: true,
        },
        actor_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        counterparty_type: {
            type: String,
            enum: ['customer', 'transporter'],
            default: null,
        },
        counterparty_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
            default: null,
            index: true,
        },
        trip_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip',
            default: null,
            index: true,
        },
        reason_code: {
            type: String,
            required: true,
        },
        reason_text: {
            type: String,
            default: '',
            trim: true,
            maxlength: 500,
        },
        cancellation_stage: {
            type: String,
            required: true,
        },
        fee_amount: {
            type: Number,
            default: 0,
            min: 0,
        },
        fee_status: {
            type: String,
            enum: ['none', 'pending', 'paid', 'waived'],
            default: 'none',
            index: true,
        },
        abuse_tier: {
            type: Number,
            default: 0,
            min: 0,
            max: 10,
        },
        gate_mode: {
            type: String,
            enum: ['none', 'soft', 'hard'],
            default: 'none',
        },
        cooldown_until: {
            type: Date,
            default: null,
        },
        penalty_points: {
            type: Number,
            default: 0,
            min: 0,
        },
        customer_comp_credit: {
            type: Number,
            default: 0,
            min: 0,
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

CancellationLedgerSchema.index({ actor_type: 1, actor_id: 1, createdAt: -1 });

const CancellationLedger = mongoose.model('CancellationLedger', CancellationLedgerSchema);
export default CancellationLedger;
