const Chat = require('../models/chat');
const Order = require('../models/order');
const {asyncHandler} = require('./utils');
const authController = require('./authController');



// Send message
const sendMessage = asyncHandler(async (req, res) => {
    
    const { orderId } = req.params;
    const { message, userType } = req.body;
    
    let userId = '';
    if (userType === 'Customer') 
        userId = authController.getCustomerId(req);
    else
        userId = authController.getTransporterId(req);

  const order = await Order.findById(orderId);


  let chat = await Chat.findOne({ order: orderId});
  if (!chat) {
    chat = new Chat({
      order: orderId,
      customer: order.customer_id,
      transporter: order.assigned_transporter_id
    });
  }

  chat.messages.push({
    senderType: userType,
    content: message
  });
  await chat.save();

  res.json({ message: 'Message sent' });
});

// Get chat history
const getChatHistory = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = authController.getUserId(req);

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const chat = await Chat.findOne({ order: orderId})
  if (!chat) {
    return res.json({ messages: [] });
  }

  const isCustomer = chat.customer.toString() === userId.toString();
  const isTransporter = chat.transporter.toString() === userId.toString();
  if (!isCustomer && !isTransporter) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const formattedMessages = chat.messages.map(msg => ({
    senderType: msg.senderType,
    content: msg.content,
    timestamp: msg.timestamp.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
  }));

  res.json({ messages: formattedMessages });
});

module.exports = {
    sendMessage,
    getChatHistory
};