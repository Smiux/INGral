import React, { useEffect, useState } from 'react';
import type { SemanticSearchResult } from '../../services/semanticSearchService';
import styles from './SearchResultsGraph.module.css';

interface SearchResultsGraphProps {
  results: SemanticSearchResult[];
}

export const SearchResultsGraph: React.FC<SearchResultsGraphProps> = ({ results }) => {
  const [showGraph, setShowGraph] = useState(false);

  useEffect(() => {
    if (results.length > 0) {
      setShowGraph(true);
    } else {
      setShowGraph(false);
    }
  }, [results]);

  return (
    <div className={styles.container}>
      {showGraph && (
        <div className={styles.graphContainer}>
          <div className={styles.layoutControls}>
            <div className={styles.controlGroup}>
              <h3 className="text-lg font-semibold mb-2">搜索结果关系图</h3>
              <p className="text-sm text-gray-600 mb-4">
                共找到 {results.length} 个结果，显示它们之间的关系
              </p>
            </div>
          </div>
          <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
            <p className="text-gray-500">关系图可视化（已简化）</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultsGraph;
