import React from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'info' | 'error';
  onClose: () => void;
}

/**
 * 通知组件
 * 显示成功、信息或错误通知
 */
export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  // 根据类型获取不同的样式类和图标
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-500',
          icon: '✓',
          borderColor: 'border-green-600',
          textColor: 'text-white'
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          icon: '✗',
          borderColor: 'border-red-600',
          textColor: 'text-white'
        };
      case 'info':
        return {
          bgColor: 'bg-blue-500',
          icon: 'ℹ',
          borderColor: 'border-blue-600',
          textColor: 'text-white'
        };
      default:
        return {
          bgColor: 'bg-gray-500',
          icon: 'ℹ',
          borderColor: 'border-gray-600',
          textColor: 'text-white'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-full">
      <div 
        className={`${styles.bgColor} ${styles.borderColor} ${styles.textColor} border-l-4 p-3 rounded-md shadow-lg flex items-center justify-between animate-fade-in`}
      >
        <div className="flex items-center gap-3">
          <div className="font-bold text-xl">{styles.icon}</div>
          <div className="text-sm font-medium">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:opacity-80 transition-opacity"
          aria-label="关闭通知"
        >
          ×
        </button>
      </div>
    </div>
  );
};
