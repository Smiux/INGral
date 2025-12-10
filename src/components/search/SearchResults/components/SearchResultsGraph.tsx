import React from 'react';
import { SemanticSearchResult } from '../../../../services/semanticSearchService';
import SearchResultsGraph from '../../SearchResultsGraph';
import styles from '../../SearchResults.module.css';

interface SearchResultsGraphProps {
  results: SemanticSearchResult[];
  query: string;
}

export const SearchResultsGraphView: React.FC<SearchResultsGraphProps> = ({ results, query }) => {
  return (
    <div className={styles.graphContainer}>
      <SearchResultsGraph results={results} query={query} />
    </div>
  );
};