import React, { useState } from 'react';
import PropTypes from 'prop-types';

const PasswordToggle = ({ value, onChange, placeholder, name }) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        style={{ paddingRight: '2rem' }}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        style={{
          position: 'absolute',
          right: '0.5rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {showPassword ? 'Hide' : 'Show'}
      </button>
    </div>
  );
};

PasswordToggle.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  name: PropTypes.string,
};

PasswordToggle.defaultProps = {
  placeholder: '',
  name: '',
};

export default PasswordToggle;