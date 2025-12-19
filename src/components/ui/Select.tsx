import React, { useState, useEffect, useRef } from 'react';
import styles from './Select.module.css';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: () => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  loading?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  className = '',
  placeholder = '请选择',
  disabled = false,
  error,
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
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

  // 清空搜索词当选项关闭时
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // 获取选中的选项
  const selectedOption = options.find(option => option.value === value);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理选项点击
  const handleOptionClick = (option: SelectOption) => {
    if (!option.disabled && !disabled) {
      onChange();
      setIsOpen(false);
    }
  };

  // 处理输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`${styles.container} ${className} ${error ? styles.error : ''} ${disabled ? styles.disabled : ''}`} ref={selectRef}>
      {/* 选择框 */}
      <button
        className={`${styles.selectButton} ${isOpen ? styles.open : ''}`}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.selectText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {loading ? (
          <div className={styles.loadingSpinner}></div>
        ) : (
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
        )}
      </button>

      {/* 下拉菜单 */}
      {isOpen && !disabled && !loading && (
        <div className={styles.dropdown}>
          {/* 搜索框 */}
          {options.length > 8 && (
            <div className={styles.searchContainer}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="搜索选项..."
                value={searchTerm}
                onChange={handleSearchChange}
                autoFocus
              />
            </div>
          )}

          {/* 选项列表 */}
          <div className={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`${styles.option} ${option.value === value ? styles.selected : ''} ${option.disabled ? styles.optionDisabled : ''}`}
                  onClick={() => handleOptionClick(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className={styles.noResults}>无匹配选项</div>
            )}
          </div>
        </div>
      )}

      {/* 错误消息 */}
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};
