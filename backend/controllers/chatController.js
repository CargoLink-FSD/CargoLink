import chatModel from '../models/chat.js';
import orderModel from '../models/order.js';
import { AppError, logger } from '../utils/misc.js';

// Send message
const sendMessage = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const userType = req.user.role;

    logger.debug(`User ${userId} (${userType}) sending message to order ${orderId}: ${message}`);

    // Validate order exists and user has access
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    // Check if user has access to this order
    const hasAccess = (userType === 'customer' && order.customer_id.toString() === userId) ||
                     (userType === 'transporter' && order.assigned_transporter_id?.toString() === userId);
    
    if (!hasAccess) {
      throw new AppError(403, "Forbidden", "Not authorized to access this chat", "ERR_FORBIDDEN");
    }

    // Find or create chat
    let chat = await chatModel.findOne({ order: orderId });
    if (!chat) {
      chat = new chatModel({
        order: orderId,
        customer: order.customer_id,
        transporter: order.assigned_transporter_id
      });
    }

    // Add message
    chat.messages.push({
      senderType: userType,
      sender_id: userId,
      content: message
    });

    await chat.save();

    res.status(200).json({ 
      success: true, 
      message: 'Message sent successfully' 
    });
  } catch (err) {
    next(err);
  }
};

// Get chat history
const getChatHistory = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    const userType = req.user.role;

    // Validate order exists and user has access
    const order = await orderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, "NotFound", "Order not found", "ERR_NOT_FOUND");
    }

    // Check if user has access to this order
    const hasAccess = (userType === 'customer' && order.customer_id.toString() === userId) ||
                     (userType === 'transporter' && order.assigned_transporter_id?.toString() === userId);
    
    if (!hasAccess) {
      throw new AppError(403, "Forbidden", "Not authorized to access this chat", "ERR_FORBIDDEN");
    }

    // Find chat
    const chat = await chatModel.findOne({ order: orderId })



    if (!chat) {
      return res.status(200).json({ 
        success: true, 
        data: { messages: [] } 
      });
    }

    // Format messages
    const formattedMessages = chat.messages.map(msg => ({
      id: msg._id,
      senderType: msg.senderType,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      formattedTime: msg.timestamp.toLocaleString('en-IN', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      })
    }));

    res.status(200).json({ 
      success: true, 
      data: { 
        messages: formattedMessages,
        customerInfo: chat.customer,
        transporterInfo: chat.transporter
      } 
    });
  } catch (err) {
    next(err);
  }
};

export default {
  sendMessage,
  getChatHistory
};