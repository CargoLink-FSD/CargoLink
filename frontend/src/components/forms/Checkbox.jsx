import PropTypes from 'prop-types';

/**
 * Reusable Checkbox Component
 * For boolean choices
 */
function Checkbox({
  label,
  id,
  name,
  checked,
  onChange,
  required = false,
  disabled = false,
  error,
  helpText,
  className = '',
  inputRef,
  ...rest
}) {
  return (
    <div className="form-group">
      <label className={`checkbox-label ${error ? 'checkbox-error' : ''} ${className}`}>
        <input
          type="checkbox"
          id={id || name}
          name={name}
          checked={checked}
          onChange={onChange}
          required={required}
          disabled={disabled}
          ref={inputRef}
          {...rest}
        />
        <span className="checkbox-text">
          {label}
          {required && <span className="required-indicator"> *</span>}
        </span>
      </label>
      
      {error && <span className="error-message">{error}</span>}
      {helpText && !error && <small className="input-help">{helpText}</small>}
    </div>
  );
}

Checkbox.propTypes = {
  label: PropTypes.node.isRequired,
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  helpText: PropTypes.string,
  className: PropTypes.string,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),
};

export default Checkbox;
