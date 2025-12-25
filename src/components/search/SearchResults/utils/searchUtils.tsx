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
export const groupSearchResults = (
  results: SemanticSearchResult[],
  groupBy: string
): Map<string, SemanticSearchResult[]> => {
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
        // 语义搜索结果没有日期属性，直接使用"无日期"分组
        groupKey = '无日期';
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
  const articles: SemanticSearchResult[] = [];

  // 分离概念和文章
  results.forEach(result => {
    if (result.type === 'concept') {
      concepts.push(result);
      conceptToArticles.set(result.id, []);
    } else if (result.type === 'article') {
      articles.push(result);
    }
  });

  // 如果没有概念，直接返回空映射
  if (concepts.length === 0) {
    return { concepts, conceptToArticles };
  }

  // 为每篇文章分配到最合适的概念
  articles.forEach(article => {
    // 1. 优先根据文章的匹配概念分配
    if (article.matched_concepts && article.matched_concepts.length > 0) {
      // 查找匹配的概念是否存在于当前概念列表中
      const matchedConcept = concepts.find(concept =>
        article.matched_concepts?.some(matched =>
          concept.title.toLowerCase().includes(matched.toLowerCase()) ||
          matched.toLowerCase().includes(concept.title.toLowerCase())
        )
      );

      if (matchedConcept) {
        const articlesForConcept = conceptToArticles.get(matchedConcept.id) || [];
        articlesForConcept.push(article);
        conceptToArticles.set(matchedConcept.id, articlesForConcept);
        return;
      }
    }

    // 2. 根据语义相似度分配给最相关的概念
    let bestConcept = concepts[0];
    let highestScore = 0;

    concepts.forEach(concept => {
      // 计算概念和文章的语义相似度分数（简化版）
      // 实际应用中可能需要更复杂的算法或预计算的相似度分数
      let similarityScore = 0;

      // 如果概念标题出现在文章标题或内容中，增加相似度
      if (article.title.toLowerCase().includes(concept.title.toLowerCase()) ||
          article.content?.toLowerCase().includes(concept.title.toLowerCase())) {
        similarityScore += 0.5;
      }

      // 如果文章有匹配的实体，检查是否与概念相关
      if (article.entity_matches) {
        const relevantEntities = article.entity_matches.filter(entity =>
          concept.title.toLowerCase().includes(entity.text.toLowerCase()) ||
          entity.text.toLowerCase().includes(concept.title.toLowerCase())
        );
        similarityScore += relevantEntities.length * 0.1;
      }

      if (similarityScore > highestScore) {
        highestScore = similarityScore;
        bestConcept = concept;
      }
    });

    // 3. 分配到最佳匹配的概念
    if (bestConcept) {
      const articlesForConcept = conceptToArticles.get(bestConcept.id) || [];
      articlesForConcept.push(article);
      conceptToArticles.set(bestConcept.id, articlesForConcept);
    }
  });

  // 4. 如果某个概念没有文章，从其他概念中分配一些文章
  const conceptsWithoutArticles = concepts.filter(concept =>
    conceptToArticles.get(concept.id)?.length === 0
  );

  conceptsWithoutArticles.forEach(emptyConcept => {
    // 找到文章最多的概念，从中分配一篇
    let conceptWithMostArticles = concepts[0];
    let maxArticles = 0;

    concepts.forEach(concept => {
      const articleCount = conceptToArticles.get(concept.id)?.length || 0;
      if (articleCount > maxArticles && concept.id !== emptyConcept.id) {
        maxArticles = articleCount;
        conceptWithMostArticles = concept;
      }
    });

    // 从文章最多的概念中分配一篇到当前空概念
    if (conceptWithMostArticles && conceptWithMostArticles.id) {
      const articlesToRedistribute = conceptToArticles.get(conceptWithMostArticles.id) || [];
      if (articlesToRedistribute.length > 1) {
        const articleToMove = articlesToRedistribute.pop();
        if (articleToMove) {
          const emptyConceptArticles = conceptToArticles.get(emptyConcept.id) || [];
          emptyConceptArticles.push(articleToMove);
          conceptToArticles.set(emptyConcept.id, emptyConceptArticles);
          conceptToArticles.set(conceptWithMostArticles.id, articlesToRedistribute);
        }
      }
    }
  });

  return { concepts, conceptToArticles };
};
