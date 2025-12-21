import React from 'react';
import type { Article } from '@/types';
import { highlightText, truncateText } from '../utils/searchUtils';
import styles from '../../SearchResults.module.css';

interface SearchResultItemProps {
  article: Article & { search_rank: number };
  query: string;
  onArticleClick?: (() => void) | undefined;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({ article, query, onArticleClick }) => {
  const handleClick = () => {
    if (onArticleClick) {
      onArticleClick();
    } else {
      // 默认行为：导航到文章详情页
      window.location.href = `/articles/${article.slug}`;
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
        <div className={styles.resultMeta}>
          <span className={styles.resultDate}>
            {article.created_at ? new Date(article.created_at).toLocaleDateString() : 'N/A'}
          </span>
          {article.tags && article.tags.length > 0 && (
            <div className={styles.resultTags}>
              {article.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className={styles.resultTag}>
                  {typeof tag === 'string' ? tag : tag.name || '未知标签'}
                </span>
              ))}
              {article.tags.length > 3 && (
                <span className={styles.resultTagMore}>+{article.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <p className={styles.resultSummary}>
        {highlightText(truncateText(article.content || ''), query)}
      </p>

      <div className={styles.resultFooter}>
        <div className={styles.resultStats}>
          <span className={styles.resultAuthor}>
            作者: {article.author_name || article.author_id || '匿名'}
          </span>
          {article.view_count !== undefined && (
            <span className={styles.resultViews}>
              浏览: {article.view_count}
            </span>
          )}
          {article.upvotes !== undefined && (
            <span className={styles.resultLikes}>
              点赞: {article.upvotes}
            </span>
          )}
          {article.comment_count !== undefined && (
            <span className={styles.resultComments}>
              评论: {article.comment_count}
            </span>
          )}
        </div>
        <span className={styles.resultRank}>
          相关度: {Math.round(article.search_rank * 100)}%
        </span>
      </div>
    </div>
  );
};
