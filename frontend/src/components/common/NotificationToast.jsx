import { useNotification } from '../../context/NotificationContext';
import '../../styles/notification.css';

export default function NotificationToast() {
  const { notification, hideNotification } = useNotification();

  if (!notification) {
    return null;
  }

  const { message, type = 'info' } = notification;

  return (
    <div className={`toast ${type}`} role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" onClick={hideNotification} aria-label="Dismiss notification">
        &times;
      </button>
    </div>
  );
}
