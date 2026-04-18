import React, { useMemo, useState } from 'react';
import { Bell, BellDot } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/common/Header';
import Footer from '../../components/common/Footer';
import {
  markAllNotificationsRead,
  markNotificationRead,
  selectNotifications,
} from '../../store/slices/notificationsSlice';
import './NotificationsPage.css';

const formatTime = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const notifications = useSelector(selectNotifications);
  const [selectedId, setSelectedId] = useState(null);

  const selected = useMemo(
    () => notifications.find((item) => item.id === selectedId) || null,
    [notifications, selectedId]
  );

  const onOpen = (notification) => {
    setSelectedId(notification.id);
    dispatch(markNotificationRead(notification.id));
  };

  return (
    <>
      <Header />
      <main className="notifications-page">
        <div className="notifications-header">
          <h1>Notifications</h1>
          <button
            type="button"
            className="mark-all-btn"
            onClick={() => dispatch(markAllNotificationsRead())}
            disabled={notifications.length === 0}
          >
            Mark all as read
          </button>
        </div>

        <div className="notifications-layout">
          <section className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                <Bell size={22} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-item ${notification.unread ? 'unread' : ''} ${selectedId === notification.id ? 'active' : ''}`}
                  onClick={() => onOpen(notification)}
                >
                  <div className="notification-item-title">
                    {notification.unread ? <BellDot size={16} /> : <Bell size={16} />}
                    <span>{notification.title}</span>
                  </div>
                  <p>{notification.message}</p>
                  <small>{formatTime(notification.createdAt)}</small>
                </button>
              ))
            )}
          </section>

          <section className="notification-detail">
            {!selected ? (
              <div className="notifications-empty">
                <p>Select a notification to view details</p>
              </div>
            ) : (
              <>
                <h2>{selected.title}</h2>
                <p>{selected.message}</p>
                <div className="notification-meta">
                  <span>Type: {selected.type || 'general'}</span>
                  <span>{formatTime(selected.createdAt)}</span>
                </div>

                {selected.meta && Object.keys(selected.meta).length > 0 && (
                  <pre className="notification-meta-box">{JSON.stringify(selected.meta, null, 2)}</pre>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
