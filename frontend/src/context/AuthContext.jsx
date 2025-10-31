import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // User state: stores the logged-in user's information
  const [user, setUser] = useState(null);
  
  // Notification state: for displaying success/error messages
  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'info' // 'success', 'error', 'warning', 'info'
  });

  const isAuthenticated = !!user;
  
  // Get user type (customer, transporter, admin)
  const userType = user?.type || null;

  useEffect(() => {
    const storedUser = localStorage.getItem('cargolink_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('cargolink_user');
      }
    }
  }, []);

  /**
   * Login function
   * @param {Object} userData - User data returned from backend after successful login
   */
  const login = (userData) => {
    setUser(userData);
    // Persist user data in localStorage
    localStorage.setItem('cargolink_user', JSON.stringify(userData));
  };

  /**
   * Logout function
   * Clears user state and removes from localStorage
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('cargolink_user');
    showNotification('Successfully logged out', 'success');
  };

  /**
   * Update user information
   * @param {Object} updatedData - Updated user fields
   */
  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('cargolink_user', JSON.stringify(updatedUser));
  };

  /**
   * Show notification message
   * @param {string} message - Message to display
   * @param {string} type - Type of notification (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({
      show: true,
      message,
      type
    });

    // Auto-hide notification after duration
    setTimeout(() => {
      setNotification({
        show: false,
        message: '',
        type: 'info'
      });
    }, duration);
  };

  /**
   * Hide notification manually
   */
  const hideNotification = () => {
    setNotification({
      show: false,
      message: '',
      type: 'info'
    });
  };

  // Context value to be provided to children
  const value = {
    user,
    userType,
    isAuthenticated,
    notification,
    login,
    logout,
    updateUser,
    showNotification,
    hideNotification
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the AuthContext
 * @returns {Object} Auth context value
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
