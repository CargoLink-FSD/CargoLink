/**
 * Notification Context
 * Provides toast/notification system globally
 */

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null);
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Core Notification Methods
  // --------------------------------------------------------------------------

  const showNotification = useCallback(({ message, type = 'info', duration = 3000 }) => {
    if (!message) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setNotification({ message, type, duration });

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        setNotification(null);
        timeoutRef.current = null;
      }, duration);
    }
  }, []);

  const hideNotification = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setNotification(null);
  }, []);

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  const showSuccess = useCallback((message, duration = 3000) => {
    showNotification({ message, type: 'success', duration });
  }, [showNotification]);

  const showError = useCallback((message, duration = 3000) => {
    showNotification({ message, type: 'error', duration });
  }, [showNotification]);

  const showWarning = useCallback((message, duration = 3000) => {
    showNotification({ message, type: 'warning', duration });
  }, [showNotification]);

  const showInfo = useCallback((message, duration = 3000) => {
    showNotification({ message, type: 'info', duration });
  }, [showNotification]);

  // --------------------------------------------------------------------------
  // Provide Context
  // --------------------------------------------------------------------------

  const value = {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
