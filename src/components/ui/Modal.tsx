import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { focusManager } from '../../utils/accessibility';

// Define modal sizes
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Define modal props interface
interface ModalProps {

  /** Whether the modal is open */
  isOpen: boolean;

  /** Called when the modal is closed */
  onClose: () => void;

  /** Modal title */
  title?: React.ReactNode;

  /** Modal content */
  children: React.ReactNode;

  /** Modal footer */
  footer?: React.ReactNode;

  /** Modal size */
  size?: ModalSize;

  /** Custom class name */
  className?: string;

  /** Whether to show the close button */
  showCloseButton?: boolean;

  /** Whether to close the modal when clicking the backdrop */
  closeOnBackdropClick?: boolean;

  /** Whether to close the modal when pressing the ESC key */
  closeOnEsc?: boolean;

  /** Modal aria-label */
  ariaLabel?: string;

  /** Modal role */
  role?: 'dialog' | 'alertdialog';
}

/**
 * Base modal component with support for different sizes, accessibility features, and keyboard navigation.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  ariaLabel,
  role = 'dialog'
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen && modalRef.current && contentRef.current) {
      // Save current focus
      focusManager.saveFocus();

      // Focus the modal content
      focusManager.focus(contentRef.current);

      // Trap focus within the modal
      focusManager.trapFocus(modalRef.current);

      // Handle ESC key
      const handleEsc = (event: KeyboardEvent) => {
        if (closeOnEsc && event.key === 'Escape') {
          onClose();
        }
      };

      // Add event listeners
      document.addEventListener('keydown', handleEsc);

      // Prevent background scrolling
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore focus
        focusManager.restoreFocus();

        // Remove event listeners
        document.removeEventListener('keydown', handleEsc);

        // Restore background scrolling
        document.body.style.overflow = '';
      };
    }
    return undefined;
  }, [isOpen, onClose, closeOnEsc]);

  // Don't render if modal is not open
  if (!isOpen) {
    return null;
  }

  // Size classes
  const sizeClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    'full': 'max-w-full'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        ref={modalRef}
        className={`relative bg-white dark:bg-neutral-800 rounded-lg shadow-xl overflow-hidden transition-all duration-300 ease-in-out ${sizeClasses[size]} ${className}`}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={title ? 'modal-content' : undefined}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        {title && (
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2
              id="modal-title"
              className="text-xl font-bold text-neutral-900 dark:text-white"
            >
              {title}
            </h2>
          </div>
        )}

        {/* Close button */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 p-1 rounded-full"
            aria-label="关闭模态框"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}

        {/* Modal content */}
        <div
          ref={contentRef}
          id="modal-content"
          className="px-6 py-4 max-h-[80vh] overflow-y-auto"
        >
          {children}
        </div>

        {/* Modal footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Modal header component
 */
interface ModalHeaderProps {

  /** Header content */
  children: React.ReactNode;

  /** Custom class name */
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Modal content component
 */
interface ModalContentProps {

  /** Content */
  children: React.ReactNode;

  /** Custom class name */
  className?: string;
}

export const ModalContent: React.FC<ModalContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 max-h-[80vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  );
};

/**
 * Modal footer component
 */
interface ModalFooterProps {

  /** Footer content */
  children: React.ReactNode;

  /** Custom class name */
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
};
