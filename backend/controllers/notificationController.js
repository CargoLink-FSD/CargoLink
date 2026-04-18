import notificationService from '../services/notificationService.js';

const pollNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.pollUserNotifications(req.user.id);

    res.status(200).json({
      success: true,
      data: notifications,
      message: 'Notifications fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUserUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      data: { unreadCount: count },
      message: 'Unread count fetched successfully',
    });
  } catch (err) {
    next(err);
  }
};

export default {
  pollNotifications,
  getUnreadCount,
};
