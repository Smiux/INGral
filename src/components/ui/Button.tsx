import React from 'react';

// Define button variants
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';

// Define button sizes
export type ButtonSize = 'sm' | 'md' | 'lg';

// Define button props interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {

  /** Button variant */
  variant?: ButtonVariant;

  /** Button size */
  size?: ButtonSize;

  /** Is button full width? */
  fullWidth?: boolean;

  /** Is button loading? */
  loading?: boolean;

  /** Custom class name */
  className?: string;

  /** Child elements */
  children: React.ReactNode;
}

/**
 * Base button component with support for different variants, sizes, and states.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  children,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
  ...props
}) => {
  // Base button classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant classes
  const variantClasses = {
    'primary': 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    'secondary': 'bg-neutral-600 text-white hover:bg-neutral-700 focus:ring-neutral-500',
    'success': 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-500',
    'warning': 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500',
    'error': 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500',
    'outline': 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500'
  };

  // Size classes
  const sizeClasses = {
    'sm': 'px-3 py-1 text-sm',
    'md': 'px-4 py-2 text-base',
    'lg': 'px-6 py-3 text-lg'
  };

  // Full width class
  const fullWidthClass = fullWidth ? 'w-full' : '';

  // Loading spinner
  const loadingSpinner = loading ? (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      role="img"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ) : null;

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidthClass} ${className}`}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-busy={loading}
      {...props}
    >
      {loadingSpinner}
      {children}
    </button>
  );
};
