/**
 * Navigation Redirect Utilities
 * Handles role-based redirects after login, signup, and role detection
 */

// Redirect user after login based on their role
export const redirectAfterLogin = (userType, navigate, delay = 1000) => {
  setTimeout(() => {
    switch (userType) {
      case 'customer':
        navigate('/customer/');
        break;
      case 'transporter':
        navigate('/transporter/');
        break;
      case 'admin':
        navigate('/admin/');
        break;
      default:
        navigate('/');
    }
  }, delay);
};

// Redirect user after signup based on their role
export const redirectAfterSignup = (userType, navigate, delay = 1500) => {
  setTimeout(() => {
    switch (userType) {
      case 'customer':
        navigate('/customer/');
        break;
      case 'transporter':
        navigate('/transporter/');
        break;
      default:
        navigate('/');
    }
  }, delay);
};

// Get home page path based on user role
export const getRedirectPath = (userType) => {
  switch (userType) {
    case 'customer':
      return '/customer/';
    case 'transporter':
      return '/transporter/';
    case 'admin':
      return '/admin/';
    default:
      return '/';
  }
};
