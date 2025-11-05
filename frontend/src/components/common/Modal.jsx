import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium', // small | medium | large
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = '',
}) {
  const enableCloseRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    let enableTimer = null;
    document.addEventListener('keydown', handleEscape);

    // Lock body scroll while modal open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Prevent click-release that opened the modal from immediately closing it
    enableCloseRef.current = false;
    enableTimer = setTimeout(() => {
      enableCloseRef.current = true;
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow || '';
      enableCloseRef.current = false;
      if (enableTimer) clearTimeout(enableTimer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = (() => {
    switch (size) {
      case 'small':
        return 'modal-sm';
      case 'large':
        return 'modal-lg';
      default:
        return 'modal-md';
    }
  })();

  const onOverlayClick = (e) => {
    if (!closeOnOverlayClick) return;
    if (!enableCloseRef.current) return;
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay active" onClick={onOverlayClick}>
      <div
        className={`modal active ${sizeClass} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Modal'}
      >
        {showCloseButton && (
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        )}
        {title && (
          <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  closeOnOverlayClick: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  className: PropTypes.string,
};