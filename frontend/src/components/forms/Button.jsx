import PropTypes from 'prop-types';

/**
 * Reusable Button Component
 * Supports primary, secondary, ghost, outline, and icon variants
 */
function Button({
  children,
  type = 'button',
  variant = 'primary', // 'primary', 'gradient', 'outline', 'gradient-outline', 'ghost', 'icon'
  onClick,
  disabled = false,
  loading = false,
  className = '',
  icon,
  iconPosition = 'left',
  size = 'medium', // 'small', 'medium', 'large'
  fullWidth = false,
  ...rest
}) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary';
      case 'gradient':
        return 'btn-gradient';
      case 'outline':
        return 'btn-outline';
      case 'gradient-outline':
        return 'btn-gradient-outline';
      case 'ghost':
        return 'btn-ghost';
      case 'icon':
        return 'btn-icon';
      default:
        return 'btn-primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'btn-sm';
      case 'large':
        return 'btn-lg';
      default:
        return '';
    }
  };

  return (
    <button
      type={type}
      className={`btn ${getVariantClass()} ${getSizeClass()} ${fullWidth ? 'btn-full-width' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <>
          <span className="btn-spinner"></span>
          Loading...
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="btn-icon-left">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="btn-icon-right">{icon}</span>}
        </>
      )}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'gradient', 'outline', 'gradient-outline', 'ghost', 'icon']),
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  className: PropTypes.string,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
};

export default Button;
