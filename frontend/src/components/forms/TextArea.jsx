import PropTypes from 'prop-types';

/**
 * Reusable TextArea Component
 * For multiline text inputs
 */
function TextArea({
  label,
  id,
  name,
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  rows = 4,
  maxLength,
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
      
      <textarea
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        id={id || name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        {...rest}
      />
      
      {error && <span className="error-message">{error}</span>}
      {helpText && !error && <small className="input-help">{helpText}</small>}
      {maxLength && (
        <small className="input-help text-right">
          {value?.length || 0}/{maxLength}
        </small>
      )}
    </div>
  );
}

TextArea.propTypes = {
  label: PropTypes.string,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.string,
  rows: PropTypes.number,
  maxLength: PropTypes.number,
  className: PropTypes.string,
};

export default TextArea;
