import CancellationLedger from '../models/cancellationLedger.js';
import Customer from '../models/customer.js';
import Transporter from '../models/transporter.js';
import {
    CANCELLATION_GRACE_MINUTES,
    FREE_CANCELLATIONS_30D,
    CANCELLATION_FEE_PLACED,
    CANCELLATION_FEE_ASSIGNED,
    CANCELLATION_FEE_NEAR_PICKUP,
    CANCELLATION_NEAR_PICKUP_HOURS,
    CANCELLATION_COOLDOWN_HOURS_TIER2,
    TRANSPORTER_LATE_CANCEL_WINDOW_HOURS,
    TRANSPORTER_RESTRICTION_DAYS,
} from '../config/index.js';
import { AppError } from '../utils/misc.js';

const REASON_FALLBACK = 'other';

const now = () => new Date();

const getWindowDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
};

const computeTier = (cancels30d) => {
    if (cancels30d >= 4) return 3;
    if (cancels30d === 3) return 2;
    if (cancels30d === 2) return 1;
    return 0;
};

const computeGateMode = (tier, outstandingCancellationDues) => {
    if (tier >= 3 && outstandingCancellationDues > 0) return 'hard';
    if (tier >= 1 && outstandingCancellationDues > 0) return 'soft';
    return 'none';
};

const getPickupHoursDelta = (order) => {
    if (!order?.scheduled_at) return Number.POSITIVE_INFINITY;
    const diffMs = new Date(order.scheduled_at).getTime() - Date.now();
    return diffMs / (60 * 60 * 1000);
};

const countCustomerCancellations = async (customerId) => {
    const [cancels7d, cancels30d] = await Promise.all([
        CancellationLedger.countDocuments({
            actor_type: 'customer',
            actor_id: customerId,
            createdAt: { $gte: getWindowDate(7) },
        }),
        CancellationLedger.countDocuments({
            actor_type: 'customer',
            actor_id: customerId,
            createdAt: { $gte: getWindowDate(30) },
        }),
    ]);

    return { cancels7d, cancels30d };
};

const countGraceCancels30d = async (customerId) => {
    return CancellationLedger.countDocuments({
        actor_type: 'customer',
        actor_id: customerId,
        cancellation_stage: 'grace_free',
        createdAt: { $gte: getWindowDate(30) },
    });
};

const classifyCustomerStage = async (order, customerId) => {
    const pickupDeltaHours = getPickupHoursDelta(order);
    if (pickupDeltaHours <= 0) {
        throw new AppError(400, 'InvalidOperation', 'Order pickup time has already passed. Please contact support.', 'ERR_PICKUP_PASSED');
    }

    if (pickupDeltaHours <= CANCELLATION_NEAR_PICKUP_HOURS) {
        return {
            stage: 'near_pickup',
            fee: CANCELLATION_FEE_NEAR_PICKUP,
            supportOnly: true,
        };
    }

    const orderAgeMs = Date.now() - new Date(order.createdAt).getTime();
    const inGraceWindow = orderAgeMs <= CANCELLATION_GRACE_MINUTES * 60 * 1000;
    const hasAssignment = !!order.assigned_transporter_id;

    if (!hasAssignment && inGraceWindow) {
        const graceCancels = await countGraceCancels30d(customerId);
        if (graceCancels < FREE_CANCELLATIONS_30D) {
            return { stage: 'grace_free', fee: 0, supportOnly: false };
        }
    }

    if (!hasAssignment) {
        return { stage: 'placed_no_assignment', fee: CANCELLATION_FEE_PLACED, supportOnly: false };
    }

    return { stage: 'assigned_to_transporter', fee: CANCELLATION_FEE_ASSIGNED, supportOnly: false };
};

const updateCustomerStats = async (customer, overrides = {}) => {
    const { cancels7d, cancels30d } = await countCustomerCancellations(customer._id);
    const tier = computeTier(cancels30d);
    const outstanding = Math.max(0, overrides.outstandingCancellationDues ?? customer.cancellation_stats?.outstandingCancellationDues ?? 0);
    const gateMode = computeGateMode(tier, outstanding);

    const cooldownUntil = tier >= 2
        ? new Date(Date.now() + CANCELLATION_COOLDOWN_HOURS_TIER2 * 60 * 60 * 1000)
        : null;

    customer.cancellation_stats = {
        ...customer.cancellation_stats,
        cancels7d,
        cancels30d,
        abuseTier: tier,
        gateMode,
        cooldownUntil,
        outstandingCancellationDues: outstanding,
        enforceAdvanceToken: tier >= 2,
    };

    await customer.save({ validateModifiedOnly: true });
    return customer.cancellation_stats;
};

export const evaluateCustomerOrderGate = async (customerId) => {
    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new AppError(404, 'NotFound', 'Customer not found', 'ERR_NOT_FOUND');
    }

    const stats = customer.cancellation_stats || {};
    const outstanding = Number(stats.outstandingCancellationDues || 0);
    const tier = Number(stats.abuseTier || 0);
    const gateMode = computeGateMode(tier, outstanding);
    const cooldownUntil = stats.cooldownUntil ? new Date(stats.cooldownUntil) : null;

    if (cooldownUntil && cooldownUntil > now()) {
        throw new AppError(429, 'RateLimit', 'Order creation is temporarily blocked due to repeated cancellations. Please try again after cooldown.', 'ERR_COOLDOWN_ACTIVE', {
            cooldownUntil,
            gateMode,
            outstandingCancellationDues: outstanding,
            abuseTier: tier,
        });
    }

    if (gateMode === 'hard') {
        throw new AppError(403, 'Forbidden', 'Please settle your pending cancellation dues before placing a new order.', 'ERR_PENDING_DUES_HARD_GATE', {
            outstandingCancellationDues: outstanding,
            abuseTier: tier,
            gateMode,
        });
    }

    return {
        gateMode,
        abuseTier: tier,
        outstandingCancellationDues: outstanding,
        enforceAdvanceToken: !!stats.enforceAdvanceToken,
    };
};

export const assertTransporterCanOperate = async (transporterId) => {
    const transporter = await Transporter.findById(transporterId).select('reliability');
    if (!transporter) {
        throw new AppError(404, 'NotFound', 'Transporter not found', 'ERR_NOT_FOUND');
    }

    const restrictionUntil = transporter.reliability?.restrictionUntil
        ? new Date(transporter.reliability.restrictionUntil)
        : null;

    if (restrictionUntil && restrictionUntil > now()) {
        throw new AppError(
            403,
            'Forbidden',
            'Your account is temporarily restricted due to repeated trip cancellations.',
            'ERR_TRANSPORTER_RESTRICTED',
            { restrictionUntil }
        );
    }

    return transporter;
};

export const applyCustomerCancellationPolicy = async ({ order, customerId, reasonCode, reasonText }) => {
    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new AppError(404, 'NotFound', 'Customer not found', 'ERR_NOT_FOUND');
    }

    const classification = await classifyCustomerStage(order, customerId);
    if (classification.supportOnly) {
        throw new AppError(400, 'InvalidOperation', 'Order is too close to pickup time. Please contact support for cancellation.', 'ERR_SUPPORT_ONLY_CANCEL');
    }

    const prevOutstanding = Number(customer.cancellation_stats?.outstandingCancellationDues || 0);
    const updatedOutstanding = prevOutstanding + classification.fee;

    const ledger = await CancellationLedger.create({
        actor_type: 'customer',
        actor_id: customer._id,
        counterparty_type: order.assigned_transporter_id ? 'transporter' : null,
        counterparty_id: order.assigned_transporter_id || null,
        order_id: order._id,
        reason_code: reasonCode || REASON_FALLBACK,
        reason_text: reasonText || '',
        cancellation_stage: classification.stage,
        fee_amount: classification.fee,
        fee_status: classification.fee > 0 ? 'pending' : 'none',
        meta: {
            scheduledAt: order.scheduled_at,
            statusBeforeCancel: order.status,
        },
    });

    const stats = await updateCustomerStats(customer, { outstandingCancellationDues: updatedOutstanding });

    await CancellationLedger.findByIdAndUpdate(ledger._id, {
        $set: {
            abuse_tier: stats.abuseTier,
            gate_mode: stats.gateMode,
            cooldown_until: stats.cooldownUntil,
        },
    });

    return {
        feeAmount: classification.fee,
        stage: classification.stage,
        ledgerId: ledger._id,
        customerStats: stats,
    };
};

export const getCustomerDuesSummary = async (customerId) => {
    const customer = await Customer.findById(customerId).select('cancellation_stats');
    if (!customer) {
        throw new AppError(404, 'NotFound', 'Customer not found', 'ERR_NOT_FOUND');
    }

    const pendingEntries = await CancellationLedger.find({
        actor_type: 'customer',
        actor_id: customerId,
        fee_status: 'pending',
        fee_amount: { $gt: 0 },
    })
        .sort({ createdAt: 1 })
        .select('order_id reason_code cancellation_stage fee_amount createdAt');

    return {
        outstandingCancellationDues: Number(customer.cancellation_stats?.outstandingCancellationDues || 0),
        gateMode: customer.cancellation_stats?.gateMode || 'none',
        abuseTier: Number(customer.cancellation_stats?.abuseTier || 0),
        cooldownUntil: customer.cancellation_stats?.cooldownUntil || null,
        pendingEntries,
    };
};

export const settleCustomerDues = async (customerId, amount) => {
    const settleAmount = Number(amount || 0);
    if (settleAmount <= 0) {
        throw new AppError(400, 'ValidationError', 'Settlement amount must be greater than zero', 'ERR_VALIDATION');
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
        throw new AppError(404, 'NotFound', 'Customer not found', 'ERR_NOT_FOUND');
    }

    let outstanding = Number(customer.cancellation_stats?.outstandingCancellationDues || 0);
    if (outstanding <= 0) {
        return {
            paidAmount: 0,
            outstandingCancellationDues: 0,
        };
    }

    let remaining = Math.min(settleAmount, outstanding);

    const ledgers = await CancellationLedger.find({
        actor_type: 'customer',
        actor_id: customerId,
        fee_status: 'pending',
        fee_amount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    for (const ledger of ledgers) {
        if (remaining <= 0) break;

        if (remaining >= ledger.fee_amount) {
            remaining -= ledger.fee_amount;
            ledger.fee_status = 'paid';
            await ledger.save({ validateModifiedOnly: true });
            continue;
        }

        ledger.fee_amount = Number((ledger.fee_amount - remaining).toFixed(2));
        remaining = 0;
        await ledger.save({ validateModifiedOnly: true });
    }

    const paidAmount = Math.min(settleAmount, outstanding) - remaining;
    outstanding = Math.max(0, outstanding - paidAmount);
    const stats = await updateCustomerStats(customer, { outstandingCancellationDues: outstanding });

    return {
        paidAmount,
        outstandingCancellationDues: stats.outstandingCancellationDues,
        gateMode: stats.gateMode,
    };
};

const countTransporterCancels30d = async (transporterId) => {
    return CancellationLedger.countDocuments({
        actor_type: 'transporter',
        actor_id: transporterId,
        createdAt: { $gte: getWindowDate(30) },
    });
};

export const applyTransporterCancellationPolicy = async ({ trip, transporterId, reasonCode, reasonText, affectedOrderIds }) => {
    const transporter = await Transporter.findById(transporterId);
    if (!transporter) {
        throw new AppError(404, 'NotFound', 'Transporter not found', 'ERR_NOT_FOUND');
    }

    const hoursToStart = trip?.planned_start_at
        ? (new Date(trip.planned_start_at).getTime() - Date.now()) / (60 * 60 * 1000)
        : Number.POSITIVE_INFINITY;

    const isLateCancel = trip.status === 'Active' || hoursToStart <= TRANSPORTER_LATE_CANCEL_WINDOW_HOURS;
    const penaltyPoints = isLateCancel ? 20 : 8;

    const currentReliability = transporter.reliability || {};
    const nextScore = Math.max(0, Number(currentReliability.score ?? 100) - penaltyPoints);

    const assignmentCancels30d = Number(currentReliability.assignmentCancels30d || 0) + 1;
    const lateCancels30d = Number(currentReliability.lateCancels30d || 0) + (isLateCancel ? 1 : 0);
    const noShowCount30d = Number(currentReliability.noShowCount30d || 0) + (trip.status === 'Active' ? 1 : 0);

    const totalCancels30d = await countTransporterCancels30d(transporterId);
    const repeatOffender = totalCancels30d + 1 >= 4 || nextScore < 60;
    const restrictionUntil = repeatOffender
        ? new Date(Date.now() + TRANSPORTER_RESTRICTION_DAYS * 24 * 60 * 60 * 1000)
        : null;

    transporter.reliability = {
        ...currentReliability,
        score: nextScore,
        assignmentCancels30d,
        lateCancels30d,
        noShowCount30d,
        restrictionUntil,
    };
    await transporter.save({ validateModifiedOnly: true });

    const ledger = await CancellationLedger.create({
        actor_type: 'transporter',
        actor_id: transporter._id,
        counterparty_type: 'customer',
        order_id: affectedOrderIds?.[0] || null,
        trip_id: trip._id,
        reason_code: reasonCode || REASON_FALLBACK,
        reason_text: reasonText || '',
        cancellation_stage: isLateCancel ? 'late_transporter_cancel' : 'transporter_cancel',
        fee_amount: 0,
        fee_status: 'none',
        penalty_points: penaltyPoints,
        customer_comp_credit: isLateCancel ? CANCELLATION_FEE_ASSIGNED : 0,
        meta: {
            affectedOrderIds: affectedOrderIds || [],
            tripStatusBeforeCancel: trip.status,
            plannedStartAt: trip.planned_start_at,
        },
    });

    return {
        ledgerId: ledger._id,
        penaltyPoints,
        repeatOffender,
        reliability: transporter.reliability,
    };
};

export default {
    evaluateCustomerOrderGate,
    assertTransporterCanOperate,
    applyCustomerCancellationPolicy,
    getCustomerDuesSummary,
    settleCustomerDues,
    applyTransporterCancellationPolicy,
};
