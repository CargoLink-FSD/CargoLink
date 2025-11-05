import PropTypes from 'prop-types';

/**
 * Reusable Select Component
 * Dropdown with single or multiple select
 */
function Select({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error,
  helpText,
  placeholder = 'Select an option',
  className = '',
  selectRef,
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
      
      <select
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        ref={selectRef}
        {...rest}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && <span className="error-message">{error}</span>}
      {helpText && !error && <small className="input-help">{helpText}</small>}
    </div>
  );
}

Select.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
      disabled: PropTypes.bool,
    })
  ),
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.string,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  selectRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

export default Select;
