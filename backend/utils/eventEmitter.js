import EventEmitter from 'events';
import { logger } from './misc.js';

export const DOMAIN_EVENTS = Object.freeze({
  BID_PLACED: 'domain.bid.placed',
  BID_ACCEPTED: 'domain.bid.accepted',
  ORDER_CANCELLED: 'domain.order.cancelled',
  CHAT_MESSAGE_SENT: 'domain.chat.message.sent',
  PAYMENT_COMPLETED: 'domain.payment.completed',
  CANCELLATION_DUES_PAID: 'domain.payment.cancellation-dues.paid',
  ORDER_REVIEW_SUBMITTED: 'domain.order.review.submitted',
  TICKET_CREATED: 'domain.ticket.created',
  TICKET_USER_REPLIED: 'domain.ticket.user.replied',
  TICKET_MANAGER_REPLIED: 'domain.ticket.manager.replied',
  TICKET_STATUS_UPDATED: 'domain.ticket.status.updated',
  TICKET_REOPENED: 'domain.ticket.reopened',
  DRIVER_APPLICATION_SUBMITTED: 'domain.driver.application.submitted',
  DRIVER_APPLICATION_ACCEPTED: 'domain.driver.application.accepted',
  DRIVER_APPLICATION_REJECTED: 'domain.driver.application.rejected',
  TRIP_CREATED: 'domain.trip.created',
  TRIP_STARTED: 'domain.trip.started',
  TRIP_PICKUP_CONFIRMED: 'domain.trip.pickup.confirmed',
  TRIP_DELIVERY_CONFIRMED: 'domain.trip.delivery.confirmed',
});

const domainEventBus = new EventEmitter();
domainEventBus.setMaxListeners(100);

export const emitDomainEvent = (eventName, payload = {}) => {
  try {
    domainEventBus.emit(eventName, {
      eventName,
      occurredAt: new Date().toISOString(),
      ...payload,
    });
  } catch (err) {
    logger.warn('Failed to emit domain event', { eventName, error: err.message });
  }
};

export const onDomainEvent = (eventName, handler) => {
  domainEventBus.on(eventName, handler);
};

export default domainEventBus;
