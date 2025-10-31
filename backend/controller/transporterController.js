const {asyncHandler} = require('./utils');
const Transporter = require('../models/transporter')
const Order = require('../models/order')
const authController = require('../controller/authController') 



const signup = asyncHandler(async (req, res) => {
    
    const {  name, email, primary_contact, secondary_contact, password, pan, gst_in, street_address, city, state, pin, vehicles} = req.body;

    const transporterData = { name, gst_in, pan, street_address, city, state,pin, primary_contact, secondary_contact, email, password};

    const existing = await Transporter.findOne({email: transporterData.email});
    if (existing) {
        return res.status(400).json({ error: 'Email is already in use' });
    }
    
    const transporter = new Transporter(transporterData);
    await transporter.save();
  
  if (transporter.error) {
      return res.status(400).json({ error: transporter.error });
  }
  
  // Loop through each vehicle submitted and add a corresponding truck record.
  if (vehicles && Array.isArray(vehicles)) {
      for (let vehicle of vehicles) {
          // Map the vehicle data fields.
          const truckData = {
              name: vehicle.name,                        
              registration: vehicle.registration,                
              capacity: vehicle.capacity,
              manufacture_year: vehicle.manufacture_year,        
              truck_type: vehicle.truck_type ,     
              last_service_date: new Date().toISOString().split('T')[0] 
          };

          // Add the truck to the Fleet table
          transporter.fleet.push(truckData);
          truckResult = await transporter.save();
          
          if (truckResult.error) {
              console.error('Error adding truck:', truckResult.error);
          } else {
              console.log('Truck added:', truckResult);
          }
      }
  }
  return res.json({success: "Sign up successful"});
});

const loadProfile = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const transporter = await Transporter.findById(transporter_id).select('-password');
    if (!transporter) {
        return res.status(404).send('Transporter not found');
    }

    const orderCount = await Order.countDocuments({ assigned_transporter_id: transporter_id });

    // Build transporter data
    const transporterData = {
        profileImage: transporter.profileImage || null, 
        memberSince: transporter.createdAt.toISOString(),
        companyName: transporter.name,
        email: transporter.email,
        phone: transporter.primary_contact,
        secondaryContact: transporter.secondary_contact,
        gstNumber: transporter.gst_in,
        panNumber: transporter.pan,
        address: transporter.street_address,
        city: transporter.city,
        state: transporter.state,
        pinCode: transporter.pin,
        totalDeliveries: orderCount,
        status: 'Active',
        vehicleCount: transporter.fleet.length,
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        console.log("Transporter Fetched: ", transporterData);
        
        return res.json({ user: transporterData });
    }
    
    res.render('transporter/profile');
});

const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const transporter_id = authController.getTransporterId(req); 
      
    const transporter = await Transporter.findById(transporter_id);
    if (!transporter) {
        return res.status(404).json({ error: 'Transporter not found' });
    }

    const isMatch = await transporter.verifyPassword(currentPassword);
    if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
    }
    transporter.updatePassword(newPassword); 
    
    res.json({ success: true, message: 'Password updated successfully' });
});


const updateProfile = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const updates = req.body;
    console.log("Updates: ", updates);

    const updatedTransporter = await Transporter.findByIdAndUpdate(
        transporter_id,
        updates,
        { new: true, runValidators: true }
    );

    console.log("Updated: ", updatedTransporter);
    
 
    if (!updatedTransporter) {
        return res.status(404).send('Transporter not found');
    }
    res.status(200).json({ message: 'Profile updated', data: updatedTransporter });

});

const getFleet = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req); 
    const result = await Transporter.findById(transporter_id).select('fleet');

    // Format the fleet data for better display
    const formattedFleet = result.fleet.map(truck => ({
        truck_id: truck._id,
        name: truck.name,
        registration: truck.registration,
        capacity: truck.capacity,
        manufacture_year: truck.manufacture_year,
        truck_type: truck.truck_type,
        status: truck.status,
        last_service_date: truck.last_service_date,
        next_service_date: truck.next_service_date,
        current_order_id: truck.current_order_id
    }));
    
    // Check if request wants JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json({ fleet: formattedFleet });
    }
    
    res.render('transporter/fleet', { 
        title: 'My Fleet - CargoLink',
        pageTitle: 'My Fleet',
        fleet: formattedFleet
    });

});

const getTruck = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req); 
    const truck_id = req.params.id;

    const truckData = await Transporter.findOne({
      _id: transporter_id,
      'fleet._id': truck_id
    }, {'fleet.$': 1});
    
    if (truckData.fleet.length == 0){
        return res.status(404).json({ error: 'Truck not found' });
    }

    const truck = truckData.fleet[0]
    // Format the truck data for better display
    const formattedTruck = {
        truck_id: truck.truck_id,
        name: truck.name,
        registration: truck.registration,
        capacity: truck.capacity,
        manufacture_year: truck.manufacture_year,
        truck_type: truck.truck_type,
        status: truck.status,
        last_service_date: truck.last_service_date,
        next_service_date: truck.next_service_date,
        current_order_id: truck.current_order_id
    };

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.json(formattedTruck);
    }

    // Otherwise render the page
    res.render('transporter/truck-details', {
        title: 'Truck Details - CargoLink',
        truckId: truck._id
    });
});

const deleteTruck = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req); 
    const truck_id = req.params.id;


    const transporter = await Transporter.findById(transporter_id);
    if (!transporter) {
        return res.status(404).json({ error: 'Transporter not Found' })
    };
    
    const result = await Transporter.updateOne(
    { _id: transporter_id },
    { $pull: { fleet: { _id: truck_id } } }
    );
        
    console.log(result);
    
    res.json({ message: 'Truck Removed' });

});

const addTruck =  asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);

    // Extract truck data from request body
    const truckData = {
        transporter_id,
        name: req.body.name,
        registration: req.body.registration,
        capacity: parseFloat(req.body.capacity),
        manufacture_year: parseInt(req.body.manufacture_year),
        truck_type: req.body.truck_type,
        status: 'Available',
        last_service_date: req.body.last_service_date
    };

    const result = await Transporter.updateOne(
      { _id: transporter_id },
      { $push: { fleet: truckData } }
    );

    res.status(201).json({
        message: 'Vehicle added successfully',
        truck: result
    });

});

const truckStatus = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const truck_id = req.params.id;

    const { status } = req.body; // Assuming `status` is 'In Maintenance' or 'Available'
    
    if (!['Available', 'In Maintenance'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

      // Use findOneAndUpdate to directly update the embedded fleet document
      const updatedTransporter = await Transporter.findOneAndUpdate(
        { 
          '_id': transporterId, 
          'fleet._id': fleetId, 
          'fleet.status': { $ne: 'Assigned' }
        },
        {$set: {
            'fleet.$.status': status,
            ...(status === 'In Maintenance' && { 'fleet.$.last_service_date': new Date() })
          }},{ new: true }
      );
      if (!updatedTransporter) {
        return res.status(404).json({ message: 'Truck not found or cannot be updated' });
      }
      return res.json({ message: `Truck status updated to ${status}` });
    
    
});

// Set truck to maintenance
const setTruckMaintenance = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const truck_id = req.params.id;

    const updatedTransporter = await Transporter.findOneAndUpdate(
        { 
            '_id': transporter_id, 
            'fleet._id': truck_id
        },
        {
            $set: {
                'fleet.$.status': 'In Maintenance',
                'fleet.$.last_service_date': new Date(),
                'fleet.$.next_service_date': null
            }
        },
        { new: true }
    );

    if (!updatedTransporter) {
        return res.status(404).json({ error: 'Truck not found' });
    }

    return res.json({ success: true, message: 'Truck set to maintenance' });
});


// Set truck to available
const setTruckAvailable = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const truck_id = req.params.id;

    const updatedTransporter = await Transporter.findOneAndUpdate(
        { 
            '_id': transporter_id, 
            'fleet._id': truck_id
        },
        {
            $set: {
                'fleet.$.status': 'Available'
            }
        },
        { new: true }
    );

    if (!updatedTransporter) {
        return res.status(404).json({ error: 'Truck not found' });
    }

    return res.json({ success: true, message: 'Truck set to available' });
});


// Set truck to unavailable
const setTruckUnavailable = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const truck_id = req.params.id;

    const updatedTransporter = await Transporter.findOneAndUpdate(
        { 
            '_id': transporter_id, 
            'fleet._id': truck_id
        },
        {
            $set: {
                'fleet.$.status': 'Unavailable'
            }
        },
        { new: true }
    );

    if (!updatedTransporter) {
        return res.status(404).json({ error: 'Truck not found' });
    }

    return res.json({ success: true, message: 'Truck set to unavailable' });
});

// Schedule maintenance
const scheduleMaintenance = asyncHandler(async (req, res) => {
    const transporter_id = authController.getTransporterId(req);
    const truck_id = req.params.id;
    const { next_service_date } = req.body;

    if (!next_service_date) {
        return res.status(400).json({ error: 'Next service date is required' });
    }

    // Check if truck already has a next service date
    const transporter = await Transporter.findOne({
        _id: transporter_id,
        'fleet._id': truck_id
    }, {'fleet.$': 1});

    if (!transporter || transporter.fleet.length === 0) {
        return res.status(404).json({ error: 'Truck not found' });
    }

    if (transporter.fleet[0].next_service_date) {
        return res.status(400).json({ error: 'Maintenance already scheduled' });
    }

    const updatedTransporter = await Transporter.findOneAndUpdate(
        { 
            '_id': transporter_id, 
            'fleet._id': truck_id
        },
        {
            $set: {
                'fleet.$.next_service_date': new Date(next_service_date)
            }
        },
        { new: true }
    );

    if (!updatedTransporter) {
        return res.status(404).json({ error: 'Failed to schedule maintenance' });
    }

    return res.json({ success: true, message: 'Maintenance scheduled successfully' });
});


module.exports = {
    signup ,
    loadProfile,
    updateProfile,
    updatePassword,
    getFleet,
    getTruck,
    deleteTruck,
    addTruck,
    truckStatus,
    setTruckMaintenance,
    setTruckAvailable,
    setTruckUnavailable,
    scheduleMaintenance
};