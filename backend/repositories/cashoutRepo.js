import CashoutRequest from '../models/cashoutRequest.js';

const createCashout = async (data) => CashoutRequest.create(data);

const findCashoutById = async (id) => CashoutRequest.findById(id);

const listCashouts = async (transporterId, { page = 1, limit = 20 } = {}) => {
  const filter = transporterId ? { transporter_id: transporterId } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CashoutRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CashoutRequest.countDocuments(filter),
  ]);
  return { items, total, page, limit, pages: Math.ceil(total / limit) };
};

const updateCashoutStatus = async (id, status, extras = {}) =>
  CashoutRequest.findByIdAndUpdate(id, { status, ...extras }, { new: true });

export default { createCashout, findCashoutById, listCashouts, updateCashoutStatus };
