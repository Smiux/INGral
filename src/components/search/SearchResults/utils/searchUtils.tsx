import React from 'react';
import type { SemanticSearchResult } from '../../../../services/semanticSearchService';

// 转义正则表达式特殊字符
export const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|\\[\\]\\]/g, '\\$&');
};

// 解析搜索查询，提取关键词
export const parseSearchQuery = (query: string): string[] => {
  if (!query.trim()) {
    return [];
  }

  // 处理引号包裹的精确短语
  const phraseRegex = /"([^"]+)"/g;
  const phrases: string[] = [];
  let match;
  let remainingQuery = query;

  // 提取引号包裹的短语
  while ((match = phraseRegex.exec(query)) !== null) {
    if (match[1]) {
      phrases.push(match[1]);
    }
    remainingQuery = remainingQuery.replace(match[0], '');
  }

  // 处理剩余的关键词，支持AND/OR/NOT逻辑
  const keywordRegex = /\\b(?!AND|OR|NOT\\b)(\\w+)\\b/gi;
  const keywords: string[] = [];

  while ((match = keywordRegex.exec(remainingQuery)) !== null) {
    if (match[1]) {
      keywords.push(match[1]);
    }
  }

  // 合并短语和关键词
  return [...phrases, ...keywords];
};

// 高亮匹配的文本，支持多关键词
export const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) {
    return text;
  }

  try {
    const keywords = parseSearchQuery(query);
    if (keywords.length === 0) {
      return text;
    }

    // 构建正则表达式，匹配所有关键词
    const keywordPatterns = keywords.map(escapeRegExp).join('|');
    const regex = new RegExp(`(${keywordPatterns})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part)
        ? <mark key={index} className="search-highlight">{part}</mark>
        : part
    );
  } catch {
    return text;
  }
};

// 截断文本
export const truncateText = (text: string, maxLength = 150): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

// 按指定字段分组搜索结果
export const groupSearchResults = (results: SemanticSearchResult[], groupBy: string): Map<string, SemanticSearchResult[]> => {
  const groups = new Map<string, SemanticSearchResult[]>();

  results.forEach(result => {
    let groupKey: string;

    switch (groupBy) {
      case 'type':
        groupKey = result.type || 'unknown';
        break;
      case 'relevance_range':
        // 按语义分数范围分组
        const score = result.semantic_score || 0;
        if (score >= 0.8) {
          groupKey = '高相关度 (80-100%)';
        } else if (score >= 0.6) {
          groupKey = '中高相关度 (60-79%)';
        } else if (score >= 0.4) {
          groupKey = '中相关度 (40-59%)';
        } else {
          groupKey = '低相关度 (0-39%)';
        }
        break;
      case 'date':
        // 语义搜索结果没有日期属性，使用当前日期作为默认值
        groupKey = new Date().toLocaleDateString('zh-CN', { 'year': 'numeric', 'month': 'long' });
        break;
      default:
        groupKey = '其他';
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)?.push(result);
  });

  return groups;
};

// 排序搜索结果
export const sortSearchResults = (results: SemanticSearchResult[], sortBy: string): SemanticSearchResult[] => {
  return [...results].sort((a, b) => {
    switch (sortBy) {
      case 'relevance':
        return (b.semantic_score || 0) - (a.semantic_score || 0);
      case 'date':
        // 语义搜索结果没有日期属性，按语义分数排序
        return (b.semantic_score || 0) - (a.semantic_score || 0);
      case 'views':
        // 语义搜索结果没有浏览量属性，按语义分数排序
        return (b.semantic_score || 0) - (a.semantic_score || 0);
      case 'type':
        return (a.type || '').localeCompare(b.type || '');
      default:
        return 0;
    }
  });
};

// 构建层级结构
export const buildHierarchicalStructure = (results: SemanticSearchResult[]) => {
  // 构建概念-文章映射
  const conceptToArticles = new Map<string, SemanticSearchResult[]>();
  const concepts: SemanticSearchResult[] = [];

  // 分离概念和文章
  results.forEach(result => {
    if (result.type === 'concept') {
      concepts.push(result);
      conceptToArticles.set(result.id, []);
    } else if (result.type === 'article') {
      // 简单地将文章分配给第一个概念，实际应用中应根据语义关系分配
      if (concepts.length > 0) {
        const firstConceptItem = concepts[0];
        if (firstConceptItem) {
          const firstConcept = firstConceptItem.id;
          const articles = conceptToArticles.get(firstConcept) || [];
          articles.push(result);
          conceptToArticles.set(firstConcept, articles);
        }
      }
    }
  });

  return { concepts, conceptToArticles };
};
