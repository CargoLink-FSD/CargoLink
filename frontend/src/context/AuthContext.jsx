/**
 * Authentication Context
 * Provides auth state and methods globally
 */

import { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialised, setInitialised] = useState(false);

  // Fetch current user on app mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        setInitialised(true);
      }
    };

    fetchCurrentUser();
  }, []);

  // --------------------------------------------------------------------------
  // Auth Methods
  // --------------------------------------------------------------------------

  const login = async ({ email, password, type }) => {
    try {
      setLoading(true);
      const userData = await authApi.login({ email, password, type });
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async ({ signupData, userType }) => {
    try {
      setLoading(true);
      const userData = await authApi.signup({ signupData, userType });
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Provide Context
  // --------------------------------------------------------------------------

  const value = {
    user,
    isAuthenticated,
    loading,
    initialised,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
