import React from 'react';

// Define card props interface
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {

  /** Card children */
  children: React.ReactNode;

  /** Custom class name */
  className?: string;

  /** Card header */
  header?: React.ReactNode;

  /** Card footer */
  footer?: React.ReactNode;

  /** Whether to show card border */
  bordered?: boolean;

  /** Whether to show card shadow */
  shadow?: boolean;
}

/**
 * Card component with optional header, footer, border, and shadow.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  header,
  footer,
  bordered = true,
  shadow = true,
  ...props
}) => {
  // Base card classes
  const baseClasses = 'rounded-lg overflow-hidden bg-white dark:bg-neutral-800';

  // Border classes
  const borderClasses = bordered ? 'border border-neutral-200 dark:border-neutral-700' : '';

  // Shadow classes
  const shadowClasses = shadow ? 'shadow-md hover:shadow-lg transition-shadow duration-200' : '';

  return (
    <div className={`${baseClasses} ${borderClasses} ${shadowClasses} ${className}`} {...props}>
      {/* Card header */}
      {header && <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">{header}</div>}

      {/* Card content */}
      <div className="p-4">{children}</div>

      {/* Card footer */}
      {footer && <div className="p-4 border-t border-neutral-200 dark:border-neutral-700">{footer}</div>}
    </div>
  );
};

// Card Header component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return <div className={`p-4 border-b border-neutral-200 dark:border-neutral-700 ${className}`}>{children}</div>;
};

// Card Body component
interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return <div className={`p-4 ${className}`}>{children}</div>;
};

// Card Footer component
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return <div className={`p-4 border-t border-neutral-200 dark:border-neutral-700 ${className}`}>{children}</div>;
};
