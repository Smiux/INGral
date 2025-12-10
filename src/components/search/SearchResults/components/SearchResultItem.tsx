import React from 'react';
import type { Article } from '@/types';
import { highlightText, truncateText } from '../utils/searchUtils';
import styles from '../../SearchResults.module.css';

interface SearchResultItemProps {
  article: Article & { search_rank: number };
  query: string;
  onArticleClick?: ((article: Article) => void) | undefined;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ article, query, onArticleClick }) => {
  const handleClick = () => {
    if (onArticleClick) {
      onArticleClick(article);
    } else {
      // 默认行为：导航到文章详情页
      window.location.href = `/article/${article.slug}`;
    }
  };

  return (
    <div
      key={article.id}
      className={styles.resultItem}
      onClick={handleClick}
    >
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>
          {highlightText(article.title, query)}
        </h3>
        <span className={styles.resultDate}>
          {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}
        </span>
      </div>

      <p className={styles.resultSummary}>
        {highlightText(truncateText(article.content || ''), query)}
      </p>

      <div className={styles.resultFooter}>
        <span className={styles.resultAuthor}>作者: {article.author_id}</span>
        <span className={styles.resultRank}>相关度: {Math.round(article.search_rank * 100)}%</span>
      </div>
    </div>
  );
};