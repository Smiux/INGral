import type { Article, Comment } from '../types';
import { BaseService } from './baseService';

// 实体类型定义
export type EntityType = 'concept' | 'article' | 'resource' | 'person' | 'organization' | 'location';

// 实体识别结果接口
export interface EntityRecognitionResult {
  text: string;
  type: EntityType;
  start: number;
  end: number;
  confidence: number;
}

// 语义搜索结果接口
export interface SemanticSearchResult {
  id: string;
  title: string;
  content?: string;
  type: 'article' | 'comment' | 'concept';
  semantic_score: number;
  search_rank?: number;
  entity_matches?: EntityRecognitionResult[];
  matched_concepts?: string[];
}

// 语义向量接口
export interface SemanticVector {
  id: string;
  vector: number[];
  type: 'article' | 'comment' | 'concept';
  updated_at: string;
}

/**
 * 语义搜索服务类，提供基于语义相似度的搜索功能
 * 包含实体识别、语义向量生成和相似度匹配
 */
export class SemanticSearchService extends BaseService {
  private static instance: SemanticSearchService;

  private readonly VECTOR_DIMENSION = 384;

  private constructor () {
    super();
  }

  /**
   * 获取单例实例
   */
  static getInstance (): SemanticSearchService {
    if (!SemanticSearchService.instance) {
      SemanticSearchService.instance = new SemanticSearchService();
    }
    return SemanticSearchService.instance;
  }

  /**
   * 生成文本的语义向量
   * @param text 输入文本
   * @returns 语义向量数组
   */
  private generateTextVector (text: string): number[] {
    // 这里使用简化的向量生成算法
    // 实际项目中应替换为真实的向量生成模型，如Hugging Face Transformers
    const normalizedText = text.toLowerCase().trim();
    let vector = new Array(this.VECTOR_DIMENSION).fill(0);

    // 简单的哈希算法生成向量
    for (let i = 0; i < normalizedText.length; i += 1) {
      const charCode = normalizedText.charCodeAt(i);
      const index = i % this.VECTOR_DIMENSION;
      vector[index] += charCode / 1000;
    }

    // 归一化向量
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      vector = vector.map(val => val / magnitude);
    }

    return vector;
  }

  /**
   * 计算两个向量的余弦相似度
   * @param vec1 向量1
   * @param vec2 向量2
   * @returns 余弦相似度分数，范围[-1, 1]
   */
  private calculateCosineSimilarity (vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i += 1) {
      // 使用类型断言确保向量元素不为undefined
      const v1 = vec1[i] as number;
      const v2 = vec2[i] as number;
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * 实体识别，从文本中提取实体
   * @param text 输入文本
   * @returns 实体识别结果数组
   */
  private recognizeEntities (text: string): EntityRecognitionResult[] {
    // 这里使用简化的实体识别算法
    // 实际项目中应替换为真实的NLP模型
    const entities: EntityRecognitionResult[] = [];
    const entityPatterns: { regex: RegExp; type: EntityType }[] = [
      { 'regex': /\b(?:文章|文档|论文|报告)\b/g, 'type': 'article' },
      { 'regex': /\b(?:概念|理论|原理|定律)\b/g, 'type': 'concept' },
      { 'regex': /\b(?:资源|链接|工具|平台)\b/g, 'type': 'resource' },
      { 'regex': /\b(?:[A-Z][a-z]+\s)+[A-Z][a-z]+\b/g, 'type': 'person' },
      { 'regex': /\b(?:公司|组织|机构|协会)\b/g, 'type': 'organization' },
      { 'regex': /\b(?:国家|城市|地区|地点)\b/g, 'type': 'location' }
    ];

    entityPatterns.forEach(({ regex, type }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          'text': match[0],
          type,
          'start': match.index,
          'end': match.index + match[0].length,
          'confidence': 0.8
        });
      }
    });

    return entities;
  }

  /**
   * 从文本中提取关键词和概念
   * @param text 输入文本
   * @returns 提取的关键词数组
   */
  private extractConcepts (text: string): string[] {
    // 简单的关键词提取，实际项目中应使用更复杂的算法
    const stopWords = ['的', '了', '和', '是', '在', '有', '为', '与', '而', '以', '于', '之', '也', '但', '并', '这', '那'];
    const words = text.toLowerCase().split(/\W+/)
      .filter(word => word.length > 1 && !stopWords.includes(word));

    // 去重
    return Array.from(new Set(words));
  }

  /**
   * 语义搜索，结合关键词和语义相似度
   * @param query 搜索查询
   * @param limit 结果数量限制，默认20
   * @returns 语义搜索结果数组
   */
  async semanticSearch (query: string, limit = 20): Promise<SemanticSearchResult[]> {
    try {
      this.checkSupabaseClient();

      // 1. 实体识别
      const entities = this.recognizeEntities(query);

      // 2. 提取概念
      const queryConcepts = this.extractConcepts(query);

      // 3. 生成查询向量
      const queryVector = this.generateTextVector(query);

      // 4. 获取所有相关内容的向量
      // 这里简化处理，直接获取文章和概念数据，然后计算相似度
      const results: SemanticSearchResult[] = [];

      // 搜索文章
      // 先获取较多结果，再进行语义排序
      const { 'data': articles } = await this.supabase
        .from('articles')
        .select('*')
        .eq('visibility', 'public')
        .limit(100);

      if (articles) {
        articles.forEach(article => {
          // 生成文章向量
          const articleVector = this.generateTextVector(`${article.title} ${article.content}`);
          // 计算相似度
          const semanticScore = this.calculateCosineSimilarity(queryVector, articleVector);

          // 设置阈值过滤不相关结果
          if (semanticScore > 0.1) {
            results.push({
              'id': article.id,
              'title': article.title,
              'content': article.content,
              'type': 'article',
              'semantic_score': semanticScore,
              'search_rank': Math.round(semanticScore * 100),
              'entity_matches': entities,
              'matched_concepts': queryConcepts.filter(concept =>
                article.content.toLowerCase().includes(concept) ||
                article.title.toLowerCase().includes(concept)
              )
            });
          }
        });
      }

      // 搜索概念节点
      const { 'data': concepts } = await this.supabase
        .from('graph_nodes')
        .select('*')
        .eq('type', 'concept')
        .limit(100);

      if (concepts) {
        concepts.forEach(concept => {
          // 生成概念向量
          const conceptVector = this.generateTextVector(`${concept.title} ${concept.description || ''}`);
          // 计算相似度
          const semanticScore = this.calculateCosineSimilarity(queryVector, conceptVector);

          // 设置阈值过滤不相关结果
          if (semanticScore > 0.1) {
            results.push({
              'id': concept.id,
              'title': concept.title,
              'content': concept.description,
              'type': 'concept',
              'semantic_score': semanticScore,
              'search_rank': Math.round(semanticScore * 100),
              'entity_matches': entities,
              'matched_concepts': queryConcepts.filter(conceptTerm =>
                concept.title.toLowerCase().includes(conceptTerm) ||
                (concept.description && concept.description.toLowerCase().includes(conceptTerm))
              )
            });
          }
        });
      }

      // 5. 排序结果：结合语义分数和搜索排名
      results.sort((a, b) => {
        // 优先按语义分数排序，其次按搜索排名
        const scoreDiff = b.semantic_score - a.semantic_score;
        if (Math.abs(scoreDiff) > 0.01) {
          return scoreDiff;
        }
        return (b.search_rank || 0) - (a.search_rank || 0);
      });

      // 6. 限制结果数量
      return results.slice(0, limit);
    } catch (error) {
      console.error('Failed to perform semantic search:', error);
      return [];
    }
  }

  /**
   * 增强传统搜索结果，添加语义相关信息
   * @param traditionalResults 传统搜索结果
   * @param query 搜索查询
   * @returns 增强后的搜索结果
   */
  async enhanceSearchResults (
    traditionalResults: ((Article | Comment) & { search_rank: number })[],
    query: string
  ): Promise<SemanticSearchResult[]> {
    try {
      // 生成查询向量
      const queryVector = this.generateTextVector(query);

      // 实体识别
      const entities = this.recognizeEntities(query);

      // 提取概念
      const queryConcepts = this.extractConcepts(query);

      // 增强每个结果
      const enhancedResults: SemanticSearchResult[] = traditionalResults.map(result => {
        // 确定结果类型
        const type: 'article' | 'comment' = 'content' in result ? 'article' : 'comment';

        // 生成结果向量
        const articleResult = result as Article & { search_rank: number };
        const resultText = type === 'article'
          ? `${articleResult.title} ${articleResult.content}`
          : result.content;
        const resultVector = this.generateTextVector(resultText);

        // 计算语义相似度
        const semanticScore = this.calculateCosineSimilarity(queryVector, resultVector);

        // 找出匹配的概念
        const matchedConcepts = queryConcepts.filter(concept =>
          resultText.toLowerCase().includes(concept)
        );

        return {
          'id': result.id,
          'title': type === 'article' ? articleResult.title : '评论',
          'content': result.content,
          type,
          'semantic_score': semanticScore,
          'search_rank': result.search_rank,
          'entity_matches': entities,
          'matched_concepts': matchedConcepts
        };
      });

      // 按语义分数重新排序
      return enhancedResults.sort((a, b) => b.semantic_score - a.semantic_score);
    } catch (error) {
      console.error('Failed to enhance search results:', error);
      // 增强失败时返回原始结果的转换形式
      return traditionalResults.map(result => {
        const articleResult = result as Article & { search_rank: number };
        return {
          'id': result.id,
          'title': 'content' in result ? articleResult.title : '评论',
          'content': result.content,
          'type': 'content' in result ? 'article' : 'comment',
          'semantic_score': 0,
          'search_rank': result.search_rank
        };
      });
    }
  }

  /**
   * 获取相似内容，基于语义向量
   * @param contentId 内容ID
   * @param contentType 内容类型
   * @param limit 结果数量限制，默认5
   * @returns 相似内容数组
   */
  async getSimilarContent (
    contentId: string,
    contentType: 'article' | 'comment' | 'concept',
    limit = 5
  ): Promise<SemanticSearchResult[]> {
    try {
      this.checkSupabaseClient();

      let contentText = '';

      // 获取源内容
      if (contentType === 'article') {
        const { 'data': article } = await this.supabase
          .from('articles')
          .select('title, content')
          .eq('id', contentId)
          .single();
        if (article) {
          contentText = `${article.title} ${article.content}`;
        }
      } else if (contentType === 'concept') {
        const { 'data': concept } = await this.supabase
          .from('graph_nodes')
          .select('title, description')
          .eq('id', contentId)
          .single();
        if (concept) {
          contentText = `${concept.title} ${concept.description || ''}`;
        }
      }

      if (!contentText) {
        return [];
      }

      // 生成源内容向量
      const sourceVector = this.generateTextVector(contentText);

      // 获取所有可能的相似内容
      const results: SemanticSearchResult[] = [];

      // 搜索文章
      const { 'data': articles } = await this.supabase
        .from('articles')
        .select('*')
        .eq('visibility', 'public')
        .neq('id', contentId)
        .limit(100);

      if (articles) {
        articles.forEach(article => {
          const articleVector = this.generateTextVector(`${article.title} ${article.content}`);
          const similarity = this.calculateCosineSimilarity(sourceVector, articleVector);

          // 设置较高阈值
          if (similarity > 0.3) {
            results.push({
              'id': article.id,
              'title': article.title,
              'content': article.content,
              'type': 'article',
              'semantic_score': similarity
            });
          }
        });
      }

      // 搜索概念
      const { 'data': concepts } = await this.supabase
        .from('graph_nodes')
        .select('*')
        .eq('type', 'concept')
        .neq('id', contentId)
        .limit(100);

      if (concepts) {
        concepts.forEach(concept => {
          const conceptVector = this.generateTextVector(`${concept.title} ${concept.description || ''}`);
          const similarity = this.calculateCosineSimilarity(sourceVector, conceptVector);

          // 设置较高阈值
          if (similarity > 0.3) {
            results.push({
              'id': concept.id,
              'title': concept.title,
              'content': concept.description,
              'type': 'concept',
              'semantic_score': similarity
            });
          }
        });
      }

      // 排序并限制结果
      return results
        .sort((a, b) => b.semantic_score - a.semantic_score)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get similar content:', error);
      return [];
    }
  }
}

// 实例导出
export const semanticSearchService = SemanticSearchService.getInstance();
