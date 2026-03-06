import Transporter from '../models/transporter.js';
import Fleet from '../models/fleet.js';

const checkEmailExists = async (email) => {
  return await Transporter.exists({ email });
};

const createTransporter = async (transporterData) => {
  const transporter = new Transporter(transporterData);
  return await transporter.save();
};

const findByEmail = async (email) => {
  return await Transporter.findOne({ email });
};

const findTransporterById = async (id) => {
  return await Transporter.findById(id);
};

const findAllTransporters = async () => {
  const transporters = await Transporter.find({})
    .select('name email city state primary_contact profilePicture')
    .lean();

  // Attach fleet counts from the separate Fleet collection
  const transporterIds = transporters.map((t) => t._id);
  const fleetCounts = await Fleet.aggregate([
    { $match: { transporter_id: { $in: transporterIds } } },
    { $group: { _id: '$transporter_id', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(fleetCounts.map((fc) => [fc._id.toString(), fc.count]));

  return transporters.map((t) => ({
    ...t,
    fleetCount: countMap[t._id.toString()] || 0,
  }));
};

const updateTransporter = async (transporterId, updates) => {
  const transporter = await Transporter.findByIdAndUpdate(transporterId, updates, { new: true }).select('-password');
  return transporter
};

const getTransporterById = async (id) => {
  return await Transporter.findById(id);
};


const getFleet = async (transporterId) => {
  const result = await Transporter.findById(transporterId).select('fleet documents.vehicle_rcs');
  const fleet = result.fleet || [];
  const vehicleRcs = result.documents?.vehicle_rcs || [];

  // Cross-reference: if a fleet item has no rc_url but a matching document exists, fill it in
  for (const vehicle of fleet) {
    const matchingRc = vehicleRcs.find(
      (rc) => rc.vehicleId?.toString() === vehicle._id?.toString()
    );
    if (matchingRc) {
      if (!vehicle.rc_url && matchingRc.url) {
        vehicle.rc_url = matchingRc.url;
      }
      // Always sync rc_status from the document's adminStatus (source of truth from manager)
      if (matchingRc.adminStatus === 'approved' && vehicle.rc_status !== 'approved') {
        vehicle.rc_status = 'approved';
      } else if (matchingRc.adminStatus === 'rejected' && vehicle.rc_status !== 'rejected') {
        vehicle.rc_status = 'rejected';
        vehicle.rc_note = matchingRc.adminNote || vehicle.rc_note;
      } else if (!vehicle.rc_status && matchingRc.adminStatus) {
        vehicle.rc_status = matchingRc.adminStatus;
      }
    }
  }

  return fleet;
};

const getTruck = async (transporterId, truckId) => {
  const truckData = await Transporter.findOne({
    _id: transporterId,
    'fleet._id': truckId
  }, { 'fleet.$': 1 });

  return truckData ? truckData.fleet[0] : null;
};


const addTruck = async (transporterId, truck) => {

  const updated = await Transporter.findOneAndUpdate(
    { _id: transporterId },
    { $push: { fleet: truck } },
    { new: true }
  );
  return updated.fleet[updated.fleet.length - 1];
};

const deleteTruck = async (transporterId, truckId) => {

  const updated = await Transporter.findOneAndUpdate(
    { _id: transporterId },
    {
      $pull: {
        fleet: { _id: truckId },
        'documents.vehicle_rcs': { vehicleId: truckId },
      },
    },
    { new: true }
  );
  logger.debug('Truck deleted, updated fleet:', { updatedFleet: updated });
  return updated.fleet;
};

const updateTruckInFleet = async (transporterId, truckId, updates) => {
  const updated = await Transporter.findOneAndUpdate(
    { _id: transporterId, 'fleet._id': truckId },
    {
      $set: Object.fromEntries(
        Object.entries(updates).map(([key, value]) => ([`fleet.$.${key}`, value]))
      )
    },
    { new: true }
  );
  logger.debug('Truck updated in fleet:', { updatedFleet: updated });
  return updated.fleet.id(truckId);
}

const saveDocuments = async (transporterId, docData) => {
  const transporter = await Transporter.findByIdAndUpdate(
    transporterId,
    { $set: docData },
    { new: true }
  );
  return transporter;
};

const getTransportersForVerification = async () => {
  return await Transporter.find({
    verificationStatus: { $in: ['under_review', 'rejected'] }
  }).select('name email pan gst_in primary_contact city state documents verificationStatus fleet createdAt');
};

const updateDocumentStatus = async (transporterId, docPath, status, note) => {
  const updateObj = { [`${docPath}.adminStatus`]: status };
  if (note) updateObj[`${docPath}.adminNote`] = note;
  return await Transporter.findByIdAndUpdate(transporterId, { $set: updateObj }, { new: true });
};

const updateVerificationStatus = async (transporterId, verificationStatus, isVerified) => {
  return await Transporter.findByIdAndUpdate(
    transporterId,
    { $set: { verificationStatus, isVerified } },
    { new: true }
  );
};

const uploadVehicleRc = async (transporterId, vehicleId, rcUrl) => {
  // Update rc_url in the Fleet collection document
  const Fleet = (await import('../models/fleet.js')).default;
  const vehicle = await Fleet.findOneAndUpdate(
    { _id: vehicleId, transporter_id: transporterId },
    {
      $set: {
        rc_url: rcUrl,
        rc_status: 'pending',
        rc_note: null,
      },
    },
    { new: true }
  );
  if (!vehicle) return null;

  // Also push / replace in transporter documents.vehicle_rcs (for manager dashboard)
  const transporter = await Transporter.findById(transporterId);
  if (!transporter) return null;

  const existing = transporter.documents?.vehicle_rcs?.find(
    (rc) => rc.vehicleId?.toString() === vehicleId.toString()
  );

  if (existing) {
    await Transporter.updateOne(
      { _id: transporterId, 'documents.vehicle_rcs._id': existing._id },
      { $set: { 'documents.vehicle_rcs.$.url': rcUrl, 'documents.vehicle_rcs.$.adminStatus': 'pending', 'documents.vehicle_rcs.$.uploadedAt': new Date() } }
    );
  } else {
    await Transporter.findByIdAndUpdate(transporterId, {
      $push: { 'documents.vehicle_rcs': { url: rcUrl, vehicleId, adminStatus: 'pending', uploadedAt: new Date() } }
    });
  }

  return await Transporter.findById(transporterId).lean();
};

const updateFleetRcStatus = async (transporterId, vehicleId, status, note = null) => {
  const Fleet = (await import('../models/fleet.js')).default;
  const update = { rc_status: status };
  if (note) update.rc_note = note;
  return await Fleet.findOneAndUpdate(
    { _id: vehicleId, transporter_id: transporterId },
    { $set: update },
    { new: true }
  );
};

export default {
  checkEmailExists,
  createTransporter,
  findByEmail,
  findTransporterById,
  findAllTransporters,
  updateTransporter,
  getTransporterById,
  getFleet,
  getTruck,
  addTruck,
  deleteTruck,
  updateTruckInFleet,
  saveDocuments,
  getTransportersForVerification,
  updateDocumentStatus,
  updateVerificationStatus,
  uploadVehicleRc,
  updateFleetRcStatus,
}