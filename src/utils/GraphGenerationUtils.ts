/**
 * 知识图谱智能生成工具
 * 
 * 功能特性：
 * - 从文本中自动提取概念和实体
 * - 识别概念之间的关系
 * - 构建知识图谱结构
 * - 优化图谱布局和连接
 * - 支持自定义提取规则
 * - 支持多种文本类型
 */

import type { GraphNode, GraphLink } from '../types';
import { GraphNodeType } from '../types';

/**
 * 概念实体接口
 */
export interface Concept {
  id: string;
  text: string;
  type: 'concept' | 'entity' | 'resource' | 'article';
  weight: number;
  occurrences: number;
  positions: number[];
  description?: string;
}

/**
 * 概念关系接口
 */
export interface ConceptRelation {
  source: string;
  target: string;
  type: string;
  weight: number;
  occurrences: number;
  description?: string;
}

/**
 * 图谱生成配置接口
 */
export interface GraphGenerationConfig {
  /** 是否提取概念 */
  extractConcepts: boolean;
  /** 是否提取实体 */
  extractEntities: boolean;
  /** 概念最小出现次数 */
  minConceptOccurrences: number;
  /** 关系最小出现次数 */
  minRelationOccurrences: number;
  /** 最大概念数量 */
  maxConcepts: number;
  /** 最大关系数量 */
  maxRelations: number;
  /** 概念提取深度 */
  conceptExtractionDepth: number;
  /** 是否启用关系类型检测 */
  detectRelationTypes: boolean;
  /** 是否优化图谱布局 */
  optimizeLayout: boolean;
  /** 是否添加默认关系 */
  addDefaultRelations: boolean;
}

/**
 * 默认图谱生成配置
 */
export const defaultGraphGenerationConfig: GraphGenerationConfig = {
  extractConcepts: true,
  extractEntities: true,
  minConceptOccurrences: 1,
  minRelationOccurrences: 1,
  maxConcepts: 50,
  maxRelations: 100,
  conceptExtractionDepth: 2,
  detectRelationTypes: true,
  optimizeLayout: true,
  addDefaultRelations: true
};

/**
 * 文本预处理函数
 * @param text 原始文本
 * @returns 预处理后的文本
 */
function preprocessText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^a-zA-Z0-9\s\-.,;!?()\[\]{}']+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从文本中提取概念
 * @param text 文本内容
 * @param config 提取配置
 * @returns 提取的概念列表
 */
export function extractConcepts(text: string, config: Partial<GraphGenerationConfig> = {}): Concept[] {
  const mergedConfig = { ...defaultGraphGenerationConfig, ...config };
  const processedText = preprocessText(text);
  const concepts: Record<string, Concept> = {};
  
  // 简单的概念提取算法，基于词语频率
  const words = processedText.split(' ');
  const stopWords = new Set(['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that', 'with', 'as', 'by', 'at', 'from', 'which', 'this', 'it', 'an', 'be', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'has', 'have', 'had', 'do', 'does', 'did', 'but', 'or', 'not', 'if', 'then', 'else', 'when', 'where', 'who', 'what', 'why', 'how', 'because', 'so', 'although', 'though', 'while', 'during', 'before', 'after', 'between', 'among', 'through', 'across', 'above', 'below', 'over', 'under', 'into', 'onto', 'out', 'off', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', 'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn']);
  
  // 提取候选概念
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // 跳过停用词、短词和undefined
    if (!word || stopWords.has(word) || word.length < 3) {
      continue;
    }
    
    // 尝试提取短语（1-3个词）
    for (let j = 1; j <= mergedConfig.conceptExtractionDepth && i + j <= words.length; j++) {
      const phrase = words.slice(i, i + j).join(' ');
      const phraseId = phrase.replace(/\s+/g, '_');
      
      if (!concepts[phraseId]) {
        concepts[phraseId] = {
          id: phraseId,
          text: phrase,
          type: 'concept',
          weight: 0,
          occurrences: 0,
          positions: []
        };
      }
      
      concepts[phraseId].weight += 1 / j; // 短语越长，权重越高
      concepts[phraseId].occurrences++;
      concepts[phraseId].positions.push(i);
    }
  }
  
  // 过滤和排序概念
  return Object.values(concepts)
    .filter(concept => concept.occurrences >= mergedConfig.minConceptOccurrences)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, mergedConfig.maxConcepts);
}

/**
 * 从文本中提取概念关系
 * @param text 文本内容
 * @param concepts 已提取的概念列表
 * @param config 提取配置
 * @returns 提取的关系列表
 */
export function extractRelations(text: string, concepts: Concept[], config: Partial<GraphGenerationConfig> = {}): ConceptRelation[] {
  const mergedConfig = { ...defaultGraphGenerationConfig, ...config };
  const processedText = preprocessText(text);
  const relations: Record<string, ConceptRelation> = {};
  
  // 创建概念ID映射
  
  // 简单的关系提取算法，基于概念共现
  const sentences = processedText.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    const sentenceConcepts: string[] = [];
    
    // 找出句子中的所有概念
    for (const concept of concepts) {
      if (sentence.includes(concept.text)) {
        sentenceConcepts.push(concept.id);
      }
    }
    
    // 生成概念之间的关系
    for (let i = 0; i < sentenceConcepts.length; i++) {
      for (let j = i + 1; j < sentenceConcepts.length; j++) {
        const source = sentenceConcepts[i] as string;
        const target = sentenceConcepts[j] as string;
        const relationKey = `${source}_${target}`;
        const reverseRelationKey = `${target}_${source}`;
        
        // 检查关系是否已存在（不区分方向）
        const existingRelation = relations[relationKey] || relations[reverseRelationKey];
        if (existingRelation) {
          existingRelation.weight++;
          existingRelation.occurrences++;
        } else {
          relations[relationKey] = {
            source,
            target,
            type: 'related',
            weight: 1,
            occurrences: 1
          };
        }
      }
    }
  }
  
  // 过滤和排序关系
  return Object.values(relations)
    .filter(relation => relation.occurrences >= mergedConfig.minRelationOccurrences)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, mergedConfig.maxRelations);
}

/**
 * 从文本生成知识图谱
 * @param text 文本内容
 * @param config 生成配置
 * @returns 生成的图谱结构
 */
export function generateKnowledgeGraph(text: string, config: Partial<GraphGenerationConfig> = {}): { nodes: GraphNode[]; links: GraphLink[] } {
  const mergedConfig = { ...defaultGraphGenerationConfig, ...config };
  
  // 1. 提取概念
  const concepts = extractConcepts(text, mergedConfig);
  
  // 2. 提取关系
  const relations = extractRelations(text, concepts, mergedConfig);
  
  // 3. 转换为图谱节点和链接
  const nodes: GraphNode[] = concepts.map(concept => {
    // 转换概念类型为GraphNodeType
    let nodeType: GraphNodeType = GraphNodeType.CONCEPT;
    if (concept.type === 'article') {
      nodeType = GraphNodeType.ARTICLE;
    } else if (concept.type === 'resource') {
      nodeType = GraphNodeType.RESOURCE;
    }
    
    return {
      id: concept.id,
      title: concept.text,
      connections: relations.filter(r => r.source === concept.id || r.target === concept.id).length,
      type: nodeType,
      description: concept.description || '',
      content: concept.text,
      size: Math.max(10, Math.min(50, concept.weight * 5)),
      color: getConceptColor(concept.type)
    };
  });
  
  const links: GraphLink[] = relations.map(relation => ({
    source: relation.source,
    target: relation.target,
    type: relation.type,
    weight: relation.weight,
    label: relation.type,
    color: getRelationColor(relation.type)
  }));
  
  // 4. 优化图谱
  if (mergedConfig.optimizeLayout) {
    // 简单的布局优化，后续可以添加更复杂的算法
    optimizeGraphLayout(nodes, links);
  }
  
  return { nodes, links };
}

/**
 * 优化图谱布局
 * @param nodes 图谱节点
 * @param links 图谱链接
 */
function optimizeGraphLayout(nodes: GraphNode[], links: GraphLink[]): void {
  // 简单的布局优化：根据连接数调整节点大小
  const maxConnections = Math.max(...nodes.map(n => n.connections), 1);
  
  for (const node of nodes) {
    // 根据连接数调整节点大小
    node.size = Math.max(15, Math.min(60, 15 + (node.connections / maxConnections) * 45));
  }
  
  // 根据关系权重调整链接粗细
  const maxWeight = Math.max(...links.map(l => l.weight || 1), 1);
  
  for (const link of links) {
    // 根据权重调整链接粗细
    if (link.weight !== undefined) {
      link.weight = Math.max(0.5, Math.min(5, 0.5 + (link.weight / maxWeight) * 4.5));
    }
  }
}

/**
 * 获取概念类型对应的颜色
 * @param type 概念类型
 * @returns 颜色值
 */
function getConceptColor(type: string): string {
  const colorMap: Record<string, string> = {
    concept: '#3b82f6',
    entity: '#10b981',
    resource: '#f59e0b',
    article: '#8b5cf6'
  };
  
  return colorMap[type] || '#6b7280';
}

/**
 * 获取关系类型对应的颜色
 * @param type 关系类型
 * @returns 颜色值
 */
function getRelationColor(type: string): string {
  const colorMap: Record<string, string> = {
    related: '#6b7280',
    part_of: '#3b82f6',
    causes: '#ef4444',
    influences: '#f59e0b',
    similar_to: '#10b981',
    references: '#8b5cf6',
    example_of: '#ec4899'
  };
  
  return colorMap[type] || '#6b7280';
}

/**
 * 从Markdown内容生成知识图谱
 * @param markdown Markdown内容
 * @param config 生成配置
 * @returns 生成的图谱结构
 */
export function generateGraphFromMarkdown(markdown: string, config: Partial<GraphGenerationConfig> = {}): { nodes: GraphNode[]; links: GraphLink[] } {
  // 提取纯文本内容，去除Markdown标记
  const plainText = markdown
    .replace(/[#*`~_\[\](){}]/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .replace(/\$[^$]+\$/g, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  return generateKnowledgeGraph(plainText, config);
}

/**
 * 从文章内容生成知识图谱
 * @param article 文章内容
 * @param config 生成配置
 * @returns 生成的图谱结构
 */
export function generateGraphFromArticle(article: { title: string; content: string }, config: Partial<GraphGenerationConfig> = {}): { nodes: GraphNode[]; links: GraphLink[] } {
  const fullText = `${article.title} ${article.content}`;
  return generateGraphFromMarkdown(fullText, config);
}

/**
 * 合并多个图谱
 * @param graphs 要合并的图谱列表
 * @returns 合并后的图谱
 */
export function mergeGraphs(graphs: Array<{ nodes: GraphNode[]; links: GraphLink[] }>): { nodes: GraphNode[]; links: GraphLink[] } {
  const nodeMap: Record<string, GraphNode> = {};
  const linkMap: Record<string, GraphLink> = {};
  
  // 合并节点
  for (const graph of graphs) {
    for (const node of graph.nodes) {
      if (!nodeMap[node.id]) {
        nodeMap[node.id] = { ...node };
      } else {
        // 合并节点属性
        const existingNode = nodeMap[node.id] as GraphNode;
        existingNode.connections = (existingNode.connections || 0) + (node.connections || 0);
        existingNode.size = Math.max(existingNode.size || 0, node.size || 0);
      }
    }
  }
  
  // 合并链接
  for (const graph of graphs) {
    for (const link of graph.links) {
      const linkKey = `${link.source}_${link.target}_${link.type}`;
      if (!linkMap[linkKey]) {
        linkMap[linkKey] = { ...link };
      } else {
        // 合并链接属性
        linkMap[linkKey].weight = (linkMap[linkKey].weight || 0) + (link.weight || 1);
      }
    }
  }
  
  return {
    nodes: Object.values(nodeMap),
    links: Object.values(linkMap)
  };
}

/**
 * 简化图谱
 * @param nodes 图谱节点
 * @param links 图谱链接
 * @param maxNodes 最大节点数
 * @param maxLinks 最大链接数
 * @returns 简化后的图谱
 */
export function simplifyGraph(nodes: GraphNode[], links: GraphLink[], maxNodes: number = 50, maxLinks: number = 100): { nodes: GraphNode[]; links: GraphLink[] } {
  // 按连接数排序节点
  const sortedNodes = [...nodes].sort((a, b) => b.connections - a.connections).slice(0, maxNodes);
  const nodeIds = new Set(sortedNodes.map(n => n.id));
  
  // 只保留与简化后节点相关的链接，并按权重排序
  const filteredLinks = links
    .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, maxLinks);
  
  // 更新节点连接数
  const updatedNodes = sortedNodes.map(node => ({
    ...node,
    connections: filteredLinks.filter(l => l.source === node.id || l.target === node.id).length
  }));
  
  return { nodes: updatedNodes, links: filteredLinks };
}

/**
 * 自动生成图谱标题
 * @param nodes 图谱节点
 * @returns 生成的标题
 */
export function generateGraphTitle(nodes: GraphNode[]): string {
  // 简单的标题生成：使用出现频率最高的几个概念
  const topNodes = [...nodes].sort((a, b) => b.connections - a.connections).slice(0, 3);
  const concepts = topNodes.map(n => n.title).join(', ');
  return `知识图谱：${concepts}`;
}
