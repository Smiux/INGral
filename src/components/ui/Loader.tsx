import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({
  size = 'medium',
  color = 'var(--primary-color)',
  variant = 'spinner',
  text,
  className = ''
}) => {
  // 根据size获取对应的类名和样式
  const sizeClass = styles[`size_${size}`];
  const spinnerStyle = {
    'borderTopColor': color,
    'borderLeftColor': color
  };
  const dotStyle = {
    'backgroundColor': color
  };
  const pulseStyle = {
    'backgroundColor': color
  };

  // 渲染不同类型的加载器
  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={`${styles.spinner} ${sizeClass}`} style={spinnerStyle}></div>
        );
      case 'dots':
        return (
          <div className={`${styles.dotsContainer} ${sizeClass}`}>
            <div className={styles.dot1} style={dotStyle}></div>
            <div className={styles.dot2} style={dotStyle}></div>
            <div className={styles.dot3} style={dotStyle}></div>
          </div>
        );
      case 'pulse':
        return (
          <div className={`${styles.pulse} ${sizeClass}`} style={pulseStyle}></div>
        );
      default:
        return (
          <div className={`${styles.spinner} ${sizeClass}`} style={spinnerStyle}></div>
        );
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      {renderLoader()}
      {text && <span className={styles.text}>{text}</span>}
    </div>
  );
};

// 常用变体的便捷组件
export const SmallLoader: React.FC<Omit<LoaderProps, 'size'>> = (props) => (
  <Loader {...props} size="small" />
);

export const MediumLoader: React.FC<Omit<LoaderProps, 'size'>> = (props) => (
  <Loader {...props} size="medium" />
);

export const LargeLoader: React.FC<Omit<LoaderProps, 'size'>> = (props) => (
  <Loader {...props} size="large" />
);

export const DotsLoader: React.FC<Omit<LoaderProps, 'variant'>> = (props) => (
  <Loader {...props} variant="dots" />
);

export const PulseLoader: React.FC<Omit<LoaderProps, 'variant'>> = (props) => (
  <Loader {...props} variant="pulse" />
);
