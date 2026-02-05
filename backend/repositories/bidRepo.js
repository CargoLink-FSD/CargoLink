import Bid from '../models/bids.js';

const getBidsForOrder = async (orderId) => {
    const bids = await Bid.find({ order_id: orderId })
        .populate('transporter_id', 'name primary_contact email');
    return bids;
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

const getBidsByTransporter = async (transporterId) => {
    const bids = await Bid.find({ transporter_id: transporterId })
        .populate('order_id' , 'pickup delivery status createdAt'); // these are actual objects not the old one
    return bids;
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