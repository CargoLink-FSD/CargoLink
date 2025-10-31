import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/Notification.css';

/**
 * Notification Component
 * Displays toast notifications for user feedback
 */
function Notification() {
  const { notification, hideNotification } = useAuth();

  // Auto-hide notification on unmount
  useEffect(() => {
    return () => {
      hideNotification();
    };
  }, []);

  if (!notification.show) {
    return null;
  }

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-content">
        <span className="notification-message">{notification.message}</span>
        <button 
          className="notification-close" 
          onClick={hideNotification}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Notification;
