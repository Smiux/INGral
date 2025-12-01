import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import styles from './DateRangePicker.module.css';

interface DateRangePickerProps {
  value: { start: Date; end: Date };
  onChange: (range: { start: Date; end: Date }) => void;
  maxDate?: Date;
  minDate?: Date;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  maxDate,
  minDate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState(value);
  const [activePanel, setActivePanel] = useState<'start' | 'end'>('start');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 处理日期变更
  const handleDateChange = (date: Date, type: 'start' | 'end') => {
    const newRange = { ...tempRange, [type]: date };
    setTempRange(newRange);
  };

  // 确认选择
  const handleConfirm = () => {
    onChange(tempRange);
    setIsOpen(false);
  };

  // 取消选择
  const handleCancel = () => {
    setTempRange(value);
    setIsOpen(false);
  };

  // 活动面板切换逻辑已移除，因为未使用

  // 快速选择预设范围
  const quickSelectRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setTempRange({ start, end });
    onChange({ start, end });
    setIsOpen(false);
  };

  // 格式化日期显示
  const formatDisplay = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div className={`${styles.container} ${className}`} ref={dropdownRef}>
      {/* 日期显示区域 */}
      <button
        className={styles.selectorButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.dateRange}>
          {formatDisplay(value.start)} — {formatDisplay(value.end)}
        </span>
        <svg
          className={`${styles.icon} ${isOpen ? styles.open : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* 日期选择器下拉面板 */}
      {isOpen && (
        <div className={styles.dropdown}>
          {/* 快速选择预设 */}
          <div className={styles.presetContainer}>
            <button
              className={styles.presetButton}
              onClick={() => quickSelectRange(7)}
            >
              最近7天
            </button>
            <button
              className={styles.presetButton}
              onClick={() => quickSelectRange(30)}
            >
              最近30天
            </button>
            <button
              className={styles.presetButton}
              onClick={() => quickSelectRange(90)}
            >
              最近90天
            </button>
            <button
              className={styles.presetButton}
              onClick={() => quickSelectRange(365)}
            >
              最近一年
            </button>
          </div>

          {/* 日期范围显示 */}
          <div className={styles.rangeDisplay}>
            <div className={`${styles.dateInput} ${activePanel === 'start' ? styles.active : ''}`}>
              <label className={styles.dateLabel}>开始日期</label>
              <input
                type="date"
                value={formatDisplay(tempRange.start)}
                onChange={(e) => handleDateChange(new Date(e.target.value), 'start')}
                max={formatDisplay(maxDate || tempRange.end)}
                min={minDate ? formatDisplay(minDate) : undefined}
                onClick={() => setActivePanel('start')}
              />
            </div>
            <div className={styles.separator}>至</div>
            <div className={`${styles.dateInput} ${activePanel === 'end' ? styles.active : ''}`}>
              <label className={styles.dateLabel}>结束日期</label>
              <input
                type="date"
                value={formatDisplay(tempRange.end)}
                onChange={(e) => handleDateChange(new Date(e.target.value), 'end')}
                max={maxDate ? formatDisplay(maxDate) : undefined}
                min={formatDisplay(tempRange.start)}
                onClick={() => setActivePanel('end')}
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className={styles.actions}>
            <button
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              className={styles.confirmButton}
              onClick={handleConfirm}
            >
              确认
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
