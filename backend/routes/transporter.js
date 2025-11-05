
const express = require('express');
const router = express.Router();
const transporterController = require('../controller/transporterController');
const authController = require('../controller/authController'); 
const authMiddleware = require("../middleware/authMiddleware")
const orderController = require('../controller/orderController')
// const { updateOrderStatus } = require('../controller/orderController');


router.get('/signup', (req, res) => {
    res.render('transporter/signup', {userType: 'transporter'});
});
router.post('/signup', transporterController.signup);

router.get('/login', (req, res) => {
    res.render('login', {userType: 'transporter'});
});

router.post('/login', authController.loginTransporter);

router.post('/forgot-password', authController.forgotPassword);

router.use(authMiddleware.isTransporter);



router.get('/profile', transporterController.loadProfile);

router.post('/update-profile', transporterController.updateProfile);

router.post('/update-password', transporterController.updatePassword);

router.get('/fleet', transporterController.getFleet);

router.get('/fleet/:id', transporterController.getTruck);

router.delete('/fleet/:id/delete',transporterController.deleteTruck);

router.post('/fleet', transporterController.addTruck);

router.post('/fleet/:id/status', transporterController.truckStatus)
// API endpoints for truck status management
router.post('/fleet/:id/set-maintenance', transporterController.setTruckMaintenance);
router.post('/fleet/:id/set-available', transporterController.setTruckAvailable);
router.post('/fleet/:id/set-unavailable', transporterController.setTruckUnavailable);
router.post('/fleet/:id/schedule-maintenance', transporterController.scheduleMaintenance);

router.get('/orders',orderController.getTransporterOrders);

router.get('/order/:orderId', orderController.getOrderDetailsTransporter); // change the additional details

router.get('/bid', orderController.getCurrentOrders);

//mybids page route
router.get('/my-bids', orderController.getTransporterBids)

router.post('/submit-bid', orderController.submitBid);

router.get('/track/:id', orderController.trackOrderTransporter);

router.post('/start-transit/:id', orderController.startTransit);

router.post('/confirm-pickup/:id', orderController.confirmPickup)





module.exports = router;