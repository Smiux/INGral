import styles from './Loader.module.css';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
}

export const Loader = ({
  size = 'medium',
  color = 'var(--primary-color)',
  variant = 'spinner',
  text,
  className = ''
}: LoaderProps) => {
  const sizeClass = styles[`size_${size}`];

  return (
    <div className={`${styles.container} ${className}`}>
      {variant === 'dots' ? (
        <div className={`${styles.dotsContainer} ${sizeClass}`}>
          <div className={styles.dot1} style={{ 'backgroundColor': color }}></div>
          <div className={styles.dot2} style={{ 'backgroundColor': color }}></div>
          <div className={styles.dot3} style={{ 'backgroundColor': color }}></div>
        </div>
      ) : (
        <div
          className={`${styles[variant]} ${sizeClass}`}
          style={{
            'backgroundColor': color,
            'borderTopColor': variant === 'spinner' ? color : undefined,
            'borderLeftColor': variant === 'spinner' ? color : undefined
          }}
        ></div>
      )}
      {text && <span className={styles.text}>{text}</span>}
    </div>
  );
};
