import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  isPositive?: boolean;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  color,
  className = ''
}) => {
  const containerStyle = color ? { 'borderLeftColor': color } : {};

  return (
    <div
      className={`${styles.container} ${className}`}
      style={containerStyle}
    >
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {icon && <div className={styles.icon}>{icon}</div>}
      </div>
      <div className={styles.value}>{value}</div>
      {change !== undefined && (
        <div className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
          <span className={styles.changeIndicator}>
            {isPositive ? '↑' : '↓'}
          </span>
          <span>{Math.abs(change)}%</span>
        </div>
      )}
    </div>
  );
};
