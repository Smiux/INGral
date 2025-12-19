import React from 'react';
import styles from './DataTable.module.css';

interface Column<T> {
  header: string;
  accessor: keyof T | string;
  render?: () => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyText?: string;
  className?: string;
  onRowClick?: () => void;
  loading?: boolean;
}

export function DataTable<T> ({
  columns,
  data,
  emptyText = '暂无数据',
  className = '',
  onRowClick,
  loading = false
}: DataTableProps<T>) {
  // 获取单元格值
  const getCellValue = (row: T, column: Column<T>) => {
    if (column.render) {
      // 自定义渲染，不在此处处理
      return null;
    }

    // 处理嵌套属性访问，如 'user.name'
    if (typeof column.accessor === 'string' && column.accessor.includes('.')) {
      return column.accessor.split('.').reduce((obj: unknown, key: string) => {
        return obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : null;
      }, row as unknown);
    }

    return row[column.accessor as keyof typeof row];
  };

  // 渲染表格内容
  const renderTable = () => {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>加载中...</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className={styles.emptyContainer}>
          <p className={styles.emptyText}>{emptyText}</p>
        </div>
      );
    }

    return (
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                className={`${styles.th} ${styles[`align_${column.align || 'left'}`]}`}
              >
                <div className={styles.thContent}>
                  {column.header}
                  {column.sortable && (
                    <svg
                      className={styles.sortIcon}
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
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
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
              onClick={() => onRowClick && onRowClick()}
            >
              {columns.map((column, colIndex) => {
                const cellValue = getCellValue(row, column);
                const content = column.render
                  ? column.render()
                  : cellValue;

                return (
                  <td
                    key={colIndex}
                    className={`${styles.td} ${styles[`align_${column.align || 'left'}`]}`}
                  >
                    {content !== undefined && content !== null ? String(content) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className={`${styles.container} ${className}`}>
      {renderTable()}
    </div>
  );
}

// 为了向后兼容，导出默认组件
export const DataTableDefault = DataTable;
export default DataTableDefault;
