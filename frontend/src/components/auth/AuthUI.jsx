import PropTypes from 'prop-types';

// Eye icon component for showing password
export function EyeIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye off icon for hiding password
export function EyeOffIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Alert/Message Display Component
function Alert({ message, type = 'info' }) {
  // Determine alert styles based on message type
  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#efe', color: '#0a0', borderColor: '#0a0' };
      case 'error':
        return { backgroundColor: '#fee', color: '#c00', borderColor: '#c00' };
      case 'warning':
        return { backgroundColor: '#fff3cd', color: '#856404', borderColor: '#856404' };
      default:
        return { backgroundColor: '#e7f3ff', color: '#004085', borderColor: '#004085' };
    }
  };

  return (
    <div 
      style={{ 
        padding: '0.75rem', 
        marginBottom: '1rem', 
        borderRadius: '4px',
        border: '1px solid',
        ...getAlertStyles()
      }}
    >
      {message}
    </div>
  );
}

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
};

export default Alert;
