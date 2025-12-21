import React from 'react';
import { SemanticSearchResult } from '../../../../services/semanticSearchService';
import { highlightText, truncateText } from '../utils/searchUtils';
import styles from '../../SearchResults.module.css';

interface SemanticSearchResultItemProps {
  result: SemanticSearchResult;
  query: string;
}

export const SemanticSearchResultItem: React.FC<SemanticSearchResultItemProps> = ({ result, query }) => {
  const handleClick = () => {
    if (result.type === 'article') {
      // 点击文章跳转到文章详情页
      window.location.href = `/articles/${result.id}`;
    } else if (result.type === 'concept') {
      // 点击概念可以跳转到概念详情页或显示概念信息
      console.log('Concept clicked:', result);
    }
  };

  return (
    <div
      className={`${styles.resultItem} ${result.type === 'concept' ? styles.conceptResultItem : ''}`}
      onClick={handleClick}
    >
      <div className={styles.resultHeader}>
        <h3 className={styles.resultTitle}>
          <span className={`${styles.resultTypeBadge} ${result.type === 'concept' ? styles.conceptBadge : styles.articleBadge}`}>
            {result.type === 'concept' ? '概念' : '文章'}
          </span>
          {highlightText(result.title, query)}
        </h3>
        <span className={styles.resultSemanticScore}>
          语义分数: {Math.round(result.semantic_score * 100)}%
        </span>
      </div>

      <p className={styles.resultSummary}>
        {highlightText(truncateText(result.content || ''), query)}
      </p>

      {/* 显示匹配的实体和概念 */}
      {(result.entity_matches && result.entity_matches.length > 0) && (
        <div className={styles.matchedEntities}>
          <span className={styles.matchedLabel}>匹配实体:</span>
          {result.entity_matches.slice(0, 3).map((entity, index) => (
            <span key={index} className={styles.entityTag}>
              {entity.text} ({entity.type})
            </span>
          ))}
          {result.entity_matches.length > 3 && (
            <span className={styles.moreEntities}>+{result.entity_matches.length - 3}</span>
          )}
        </div>
      )}

      {(result.matched_concepts && result.matched_concepts.length > 0) && (
        <div className={styles.matchedConcepts}>
          <span className={styles.matchedLabel}>匹配概念:</span>
          {result.matched_concepts.slice(0, 3).map((concept, index) => (
            <span key={index} className={styles.conceptTag}>
              {concept}
            </span>
          ))}
          {result.matched_concepts.length > 3 && (
            <span className={styles.moreConcepts}>+{result.matched_concepts.length - 3}</span>
          )}
        </div>
      )}

      <div className={styles.resultFooter}>
        {result.type === 'article' && result.search_rank && (
          <span className={styles.resultRank}>相关度: {Math.round(result.search_rank * 100)}%</span>
        )}
      </div>
    </div>
  );
};
