import crypto from 'crypto';
import {
  enqueueNotification,
  dequeueAllNotifications,
  getNotificationQueueSize,
} from '../core/cache.js';
import { sendToUser, isUserConnected } from '../core/ws.js';
import { DOMAIN_EVENTS, onDomainEvent } from '../utils/eventEmitter.js';
import { logger } from '../utils/misc.js';

let initialized = false;

const normalizeRecipientId = (recipient) => {
  if (!recipient) return null;
  if (typeof recipient === 'string') return recipient;
  if (typeof recipient === 'object') {
    return recipient.userId || recipient.id || recipient._id || null;
  }
  return null;
};

const buildNotification = (eventPayload, recipient) => {
  const recipientId = normalizeRecipientId(recipient);
  if (!recipientId) return null;

  return {
    id: crypto.randomUUID(),
    eventName: eventPayload.eventName,
    type: eventPayload.type || eventPayload.eventName,
    title: eventPayload.title || 'New activity',
    message: eventPayload.message || 'There is an update on your account.',
    meta: eventPayload.meta || {},
    actor: eventPayload.actor || null,
    recipient: {
      userId: recipientId,
      role: recipient?.role || null,
    },
    createdAt: eventPayload.occurredAt || new Date().toISOString(),
    unread: true,
  };
};

const deliverNotification = async (notification) => {
  const recipientId = notification?.recipient?.userId;
  if (!recipientId) return;

  try {
    if (isUserConnected(recipientId)) {
      const delivered = sendToUser(recipientId, {
        type: 'notification:new',
        data: notification,
      });

      if (delivered > 0) {
        return;
      }
    }

    await enqueueNotification(recipientId, notification);
  } catch (err) {
    logger.warn('Notification delivery failed, queuing skipped', {
      recipientId,
      error: err.message,
    });
  }
};

const handleDomainEvent = async (eventPayload) => {
  const recipients = Array.isArray(eventPayload?.recipients)
    ? eventPayload.recipients
    : [];

  if (!recipients.length) return;

  for (const recipient of recipients) {
    const notification = buildNotification(eventPayload, recipient);
    if (!notification) continue;
    await deliverNotification(notification);
  }
};

export const initializeNotificationService = () => {
  if (initialized) {
    return;
  }

  Object.values(DOMAIN_EVENTS).forEach((eventName) => {
    onDomainEvent(eventName, (payload) => {
      void handleDomainEvent(payload);
    });
  });

  initialized = true;
  logger.info('Notification service initialized');
};

export const pollUserNotifications = async (userId) => {
  if (!userId) return [];
  return dequeueAllNotifications(userId);
};

export const getUserUnreadCount = async (userId) => {
  if (!userId) return 0;
  return getNotificationQueueSize(userId);
};

export default {
  initializeNotificationService,
  pollUserNotifications,
  getUserUnreadCount,
};
