import React, { useState, useCallback } from 'react';
import { SemanticSearchResult } from '../../../../services/semanticSearchService';
import { buildHierarchicalStructure, highlightText, truncateText } from '../utils/searchUtils';
import styles from '../../SearchResults.module.css';

interface SearchResultsHierarchicalProps {
  semanticResults: SemanticSearchResult[];
  query: string;
}

export const SearchResultsHierarchical: React.FC<SearchResultsHierarchicalProps> = ({ semanticResults, query }) => {
  // 层级展开状态
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 切换层级展开状态
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // 检查项目是否展开
  const isExpanded = useCallback((itemId: string) => {
    return expandedItems.has(itemId);
  }, [expandedItems]);

  return (
    <div className={styles.hierarchicalContainer}>
      {(() => {
        const { concepts, conceptToArticles } = buildHierarchicalStructure(semanticResults);

        if (concepts.length === 0) {
          // 没有概念，直接显示所有结果
          return (
            <div className={styles.resultsList}>
              {semanticResults.map((result) => (
                <div
                  key={result.id}
                  className={`${styles.resultItem} ${result.type === 'concept' ? styles.conceptResultItem : ''}`}
                  onClick={() => {
                    if (result.type === 'article') {
                      window.location.href = `/articles/${result.id}`;
                    } else if (result.type === 'concept') {
                      console.log('Concept clicked:', result);
                    }
                  }}
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
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className={styles.hierarchicalTree}>
            {concepts.map((concept) => (
              <div key={concept.id} className={styles.hierarchicalItem}>
                <div
                  className={styles.hierarchicalItemHeader}
                  onClick={() => toggleExpanded(concept.id)}
                >
                  <span className={`${styles.expandIcon} ${isExpanded(concept.id) ? styles.expanded : ''}`}>
                    {isExpanded(concept.id) ? '▼' : '▶'}
                  </span>
                  <h3 className={`${styles.hierarchicalItemTitle} ${concept.type === 'concept' ? styles.conceptResultItem : ''}`}>
                    <span className={`${styles.resultTypeBadge} ${concept.type === 'concept' ? styles.conceptBadge : styles.articleBadge}`}>
                      {concept.type === 'concept' ? '概念' : '文章'}
                    </span>
                    {highlightText(concept.title, query)}
                  </h3>
                  <span className={styles.resultSemanticScore}>
                    语义分数: {Math.round(concept.semantic_score * 100)}%
                  </span>
                </div>

                {isExpanded(concept.id) && (
                  <div className={styles.hierarchicalItemContent}>
                    <div className={styles.hierarchicalItemSummary}>
                      {highlightText(truncateText(concept.content || ''), query)}
                    </div>

                    {conceptToArticles.get(concept.id) && conceptToArticles.get(concept.id)!.length > 0 && (
                      <div className={styles.hierarchicalChildren}>
                        <h4 className={styles.hierarchicalChildrenTitle}>相关文章</h4>
                        {conceptToArticles.get(concept.id)!.map((article) => (
                          <div
                            key={article.id}
                            className={styles.hierarchicalChildItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/articles/${article.id}`;
                            }}
                          >
                            <span className={styles.resultTypeBadge}>
                              文章
                            </span>
                            <span className={styles.hierarchicalChildTitle}>
                              {highlightText(article.title, query)}
                            </span>
                            <span className={styles.resultSemanticScore}>
                              语义分数: {Math.round(article.semantic_score * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
};
