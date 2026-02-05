import PropTypes from 'prop-types';

/**
 * Reusable InputField Component
 * Supports text, email, password, number, tel, and other input types
 */
function InputField({
  label,
  type = 'text',
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
  autoComplete,
  inputRef,
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
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        ref={inputRef}
        {...rest}
      />
      
      {error && <span className="error-message">{error}</span>}
      {helpText && !error && <small className="input-help">{helpText}</small>}
    </div>
  );
}

InputField.propTypes = {
  label: PropTypes.string,
  type: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.string,
  className: PropTypes.string,
  autoComplete: PropTypes.string,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

export default InputField;
