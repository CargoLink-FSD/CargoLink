import PropTypes from 'prop-types';

/**
 * Reusable DatePicker Component
 * For date and time selection
 */
function DatePicker({
  label,
  type = 'date', // 'date', 'time', 'datetime-local'
  id,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  helpText,
  min,
  max,
  className = '',
  ...rest
}) {
  return (
    <div className="form-group">
      {label && (
        <label className="input-label" htmlFor={id || name}>
          {label}
          {required && <span className="required-indicator"> *</span>}
        </label>
      )}
      
      <input
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        type={type}
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        {...rest}
      />
      
      {error && <span className="error-message">{error}</span>}
      {helpText && !error && <small className="input-help">{helpText}</small>}
    </div>
  );
}

DatePicker.propTypes = {
  label: PropTypes.string,
  type: PropTypes.oneOf(['date', 'time', 'datetime-local']),
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.string,
  min: PropTypes.string,
  max: PropTypes.string,
  className: PropTypes.string,
};

export default DatePicker;
