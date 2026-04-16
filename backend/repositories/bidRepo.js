import Bid from '../models/bids.js';
import { parsePaginationParams } from '../utils/misc.js';

const getBidsForOrder = async (orderId, { page, limit } = {}) => {
    const query = { order_id: orderId };
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 10, maxLimit: 100 });
    const findQuery = Bid.find(query)
        .populate('transporter_id', 'name primary_contact email')
        .sort({ bid_amount: 1, createdAt: -1 });

    if (pagination) {
        const [bids, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Bid.countDocuments(query),
        ]);
        return {
            items: bids,
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

const deleteBidsForOrder = async (orderId) => {
    await Bid.deleteMany({ order_id: orderId });
};

const getBidById = async (bidId) => {
    return await Bid.findById(bidId).populate('transporter_id', 'name primary_contact email');
};

const deleteBidById = async (bidId) => {
    await Bid.findByIdAndDelete(bidId);
};

const getBidsByTransporter = async (transporterId, { page, limit } = {}) => {
    const query = { transporter_id: transporterId };
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 10, maxLimit: 100 });
    const findQuery = Bid.find(query)
        .populate('order_id', 'pickup delivery status createdAt')
        .sort({ createdAt: -1 });

    if (pagination) {
        const [bids, total] = await Promise.all([
            findQuery.skip(pagination.skip).limit(pagination.limit).lean(),
            Bid.countDocuments(query),
        ]);

        return {
            items: bids,
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

const createBid = async (bidData) => {
    const bid = new Bid(bidData);
    await bid.save();
    return bid;
};

const existsBidForTransporter = async (bidId, transporterId) => {
    return await Bid.exists({ _id: bidId, transporter_id: transporterId });
};

export default {
    getBidsForOrder,
    deleteBidsForOrder,
    getBidById,
    deleteBidById,
    getBidsByTransporter,
    createBid,
    existsBidForTransporter,
}