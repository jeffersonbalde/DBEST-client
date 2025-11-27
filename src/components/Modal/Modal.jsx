import React, { useEffect } from 'react';
import Portal from '../Portal/Portal';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, size = 'md', showCloseButton = true }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className={`modal-content modal-${size}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            {title && <h5 className="modal-title">{title}</h5>}
            {showCloseButton && (
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              ></button>
            )}
          </div>
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default Modal;

