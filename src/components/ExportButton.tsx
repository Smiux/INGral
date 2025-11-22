import React, { useState } from 'react';
import { Article } from '../types';
import exportService from '../services/exportService';
import styles from './ExportButton.module.css';

interface ExportButtonProps {
  article: Article;
  className?: string;
}

/**
 * 导出按钮组件
 * 提供文章导出功能，支持Markdown、HTML和PDF格式
 */
const ExportButton: React.FC<ExportButtonProps> = ({ article, className = '' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 处理导出操作
  const handleExport = async (format: 'markdown' | 'html' | 'pdf') => {
    setIsExporting(true);
    setIsMenuOpen(false);
    
    try {
      switch (format) {
        case 'markdown':
          await exportService.exportArticleToMarkdown(article);
          break;
        case 'html':
          await exportService.exportArticleToHtml(article);
          break;
        case 'pdf':
          await exportService.exportArticleToPdf(article);
          break;
      }
    } catch (error) {
      console.error(`导出为${format}失败:`, error);
      // 这里可以添加错误提示
      alert(`导出失败: ${(error as Error).message || '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 处理点击外部关闭菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.exportButtonWrapper}`)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`${styles.exportButtonWrapper} ${className}`}>
      <button
        className={`${styles.exportButton} ${isMenuOpen ? styles.active : ''}`}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        disabled={isExporting}
        aria-label="导出文章"
        title="导出文章"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>导出</span>
        {isExporting && <span className={styles.loadingIndicator}>处理中...</span>}
      </button>
      
      {isMenuOpen && (
        <div className={styles.exportMenu}>
          <button
            className={`${styles.exportMenuItem} ${isExporting ? styles.disabled : ''}`}
            onClick={() => handleExport('markdown')}
            disabled={isExporting}
          >
            <svg
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Markdown (.md)
          </button>
          
          <button
            className={`${styles.exportMenuItem} ${isExporting ? styles.disabled : ''}`}
            onClick={() => handleExport('html')}
            disabled={isExporting}
          >
            <svg
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            HTML (.html)
          </button>
          
          <button
            className={`${styles.exportMenuItem} ${isExporting ? styles.disabled : ''}`}
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
          >
            <svg
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
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
