const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware")
const chatController = require('../controller/chatController')


router.use(authMiddleware.isUser)

router.post('/orders/:orderId', chatController.sendMessage);
router.get("/orders/:orderId", chatController.getChatHistory);

module.exports = router;