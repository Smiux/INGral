import React, { useState, useEffect, useRef } from 'react';

// Define tooltip placement
export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

// Define tooltip props interface
interface TooltipProps {

  /** Tooltip content */
  content: React.ReactNode;

  /** Tooltip children */
  children: React.ReactNode;

  /** Tooltip placement */
  placement?: TooltipPlacement;

  /** Tooltip delay in milliseconds */
  delay?: number;

  /** Custom class name */
  className?: string;

  /** Whether the tooltip is always visible */
  isVisible?: boolean;

  /** Tooltip aria-label */
  ariaLabel?: string;

  /** Whether to disable the tooltip */
  disabled?: boolean;
}

/**
 * Base tooltip component with support for different placements, delays, and accessibility features.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  delay = 200,
  className = '',
  'isVisible': propIsVisible,
  ariaLabel,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Determine if the tooltip should be controlled or uncontrolled
  const isControlled = propIsVisible !== undefined;
  const visible = isControlled ? propIsVisible : isVisible;

  // Mount effect
  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Handle mouse enter
  const handleMouseEnter = () => {
    if (disabled || isControlled) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (disabled || isControlled) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsVisible(false);
  };

  // Handle focus
  const handleFocus = () => {
    if (disabled || isControlled) {
      return;
    }
    setIsVisible(true);
  };

  // Handle blur
  const handleBlur = () => {
    if (disabled || isControlled) {
      return;
    }
    setIsVisible(false);
  };

  // Placement classes
  const placementClasses = {
    'top': 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    'bottom': 'top-full left-1/2 -translate-x-1/2 mt-2',
    'left': 'right-full top-1/2 -translate-y-1/2 mr-2',
    'right': 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  // Arrow classes
  const arrowClasses = {
    'top': 'bottom-[-5px] left-1/2 -translate-x-1/2 rotate-45',
    'bottom': 'top-[-5px] left-1/2 -translate-x-1/2 -rotate-45',
    'left': 'right-[-5px] top-1/2 -translate-y-1/2 -rotate-45',
    'right': 'left-[-5px] top-1/2 -translate-y-1/2 rotate-45'
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-label={ariaLabel}
      aria-describedby={visible && isMounted ? 'tooltip-content' : undefined}
    >
      {/* Trigger element */}
      {React.Children.only(children)}

      {/* Tooltip */}
      {visible && isMounted && (
        <div
          id="tooltip-content"
          className={`absolute z-50 px-3 py-1.5 text-sm font-medium text-white 
            bg-neutral-900 dark:bg-neutral-800 rounded-md shadow-lg 
            opacity-90 transition-all duration-200 transform opacity-100 pointer-events-none 
            ${placementClasses[placement]} 
            ${className}`}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div className={`absolute w-2.5 h-2.5 bg-neutral-900 dark:bg-neutral-800 ${arrowClasses[placement]}`}></div>
        </div>
      )}
    </div>
  );
};
