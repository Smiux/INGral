import React from 'react';

// Define textarea sizes
export type TextareaSize = 'sm' | 'md' | 'lg';

// Define textarea props interface
interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {

  /** Textarea size */
  size?: TextareaSize;

  /** Custom class name */
  className?: string;

  /** Label text */
  label?: string;

  /** Error message */
  error?: string;

  /** Helper text */
  helperText?: string;
}

/**
 * Base textarea component with support for different sizes, labels, and error states.
 */
export const Textarea: React.FC<TextareaProps> = ({
  size = 'md',
  className = '',
  label,
  error,
  helperText,
  id,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}) => {
  // Generate a unique ID if not provided
  const textareaId = id || `textarea-${Math.random().toString(36)
    .substr(2, 9)}`;
  const descriptionId = `${textareaId}-description`;
  const errorId = error ? `${textareaId}-error` : undefined;

  // Calculate aria-describedby value to avoid nested ternary
  let describedBy;
  if (error) {
    describedBy = errorId;
  } else if (helperText) {
    describedBy = descriptionId;
  } else {
    describedBy = undefined;
  }

  // Base textarea classes
  const baseClasses = 'block w-full rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed resize-y';

  // Size classes
  const sizeClasses = {
    'sm': 'px-3 py-1 text-sm min-h-[80px]',
    'md': 'px-4 py-2 text-base min-h-[120px]',
    'lg': 'px-6 py-3 text-lg min-h-[160px]'
  };

  // State classes
  const stateClasses = error
    ? 'border-error-500 focus:ring-error-500 bg-error-50 dark:bg-error-900/20'
    : 'border-neutral-300 focus:border-primary-500 bg-white dark:bg-neutral-800';

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          {label}
          {props.required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}

      {/* Textarea field */}
      <textarea
        id={textareaId}
        className={`${baseClasses} ${sizeClasses[size]} ${stateClasses} ${className}`}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || Boolean(ariaInvalid) || false}
        aria-required={ariaRequired || props.required || false}
        {...props}
      />

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-sm mt-1 text-error-500 dark:text-error-400"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p
          id={descriptionId}
          className="text-sm mt-1 text-neutral-500 dark:text-neutral-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
};
