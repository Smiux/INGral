import { BaseService } from './baseService';
import type { Graph, GraphNode, GraphLink, Article } from '../types/index';
import { calculateEditLimitStatus, buildUpdateWithEditLimit } from '../utils/editLimitUtils';

/**
 * 图谱服务类，处理图谱相关操作
 */
export class GraphService extends BaseService {
  private readonly TABLE_NAME = 'user_graphs';

  /**
   * 获取所有图谱
   * @param visibility 图谱可见性
   */
  async getAllGraphs(visibility: 'public' | 'unlisted' = 'public'): Promise<Graph[]> {
    const result = await this.supabase.from(this.TABLE_NAME).select('*').eq('visibility', visibility);
    return result.data || [];
  }

  /**
   * 获取图谱详情
   * @param graphId 图谱ID
   */
  async getGraphById(graphId: string): Promise<Graph | null> {
    // 获取图谱基本信息
    const graphResult = await this.supabase.from(this.TABLE_NAME).select('*').eq('id', graphId).single<Graph>();
    
    if (!graphResult.data) {
      return null;
    }

    // 获取图谱节点
    const nodesResult = await this.supabase.from('graph_nodes').select('*').eq('graph_id', graphId);

    // 获取图谱链接
    const linksResult = await this.supabase.from('graph_links').select('*').eq('graph_id', graphId);

    return {
      ...graphResult.data,
      nodes: nodesResult.data || [],
      links: linksResult.data || []
    };
  }

  /**
   * 分页获取图谱详情
   * @param graphId 图谱ID
   * @param options 分页选项
   */
  async getGraphByIdWithPagination(graphId: string, options: {
    nodePage?: number;
    nodeLimit?: number;
    linkPage?: number;
    linkLimit?: number;
    includeBasicInfo?: boolean;
  } = {}): Promise<Graph | null> {
    const {
      nodePage = 1,
      nodeLimit = 50,
      linkPage = 1,
      linkLimit = 100,
      includeBasicInfo = true
    } = options;
    
    // 获取图谱基本信息
    const graphResult = includeBasicInfo 
      ? await this.supabase.from(this.TABLE_NAME).select('*').eq('id', graphId).single<Graph>()
      : { data: { id: graphId, nodes: [], links: [] } as unknown as Graph };
    
    if (!graphResult.data) {
      return null;
    }

    // 分页获取图谱节点
    const nodesResult = await this.supabase.from('graph_nodes')
      .select('*')
      .eq('graph_id', graphId)
      .order('connections', { ascending: false })
      .limit(nodeLimit)
      .range((nodePage - 1) * nodeLimit, nodePage * nodeLimit - 1);

    // 分页获取图谱链接
    const linksResult = await this.supabase.from('graph_links')
      .select('*')
      .eq('graph_id', graphId)
      .limit(linkLimit)
      .range((linkPage - 1) * linkLimit, linkPage * linkLimit - 1);

    return {
      ...graphResult.data,
      nodes: nodesResult.data || [],
      links: linksResult.data || []
    };
  }

  /**
   * 获取指定节点的邻居节点和链接
   * @param graphId 图谱ID
   * @param nodeId 节点ID
   */
  async getNeighborNodes(graphId: string, nodeId: string): Promise<{
    nodes: GraphNode[];
    links: GraphLink[];
  }> {
    // 获取节点本身
    const nodeResult = await this.supabase.from('graph_nodes')
      .select('*')
      .eq('id', nodeId)
      .eq('graph_id', graphId)
      .single<GraphNode>();

    if (!nodeResult.data) {
      return { nodes: [], links: [] };
    }

    // 获取直接相连的链接
    const linksResult = await this.supabase.from('graph_links')
      .select('*')
      .eq('graph_id', graphId)
      .or(`source.eq.${nodeId},target.eq.${nodeId}`);

    const links = linksResult.data || [];
    const neighborNodeIds = new Set<string>();

    // 提取邻居节点ID
    links.forEach((link: GraphLink) => {
      if (link.source !== nodeId) {
        neighborNodeIds.add(link.source);
      }
      if (link.target !== nodeId) {
        neighborNodeIds.add(link.target);
      }
    });

    // 获取邻居节点
    const neighborNodesResult = await this.supabase.from('graph_nodes')
      .select('*')
      .eq('graph_id', graphId)
      .in('id', Array.from(neighborNodeIds));

    const nodes = [nodeResult.data, ...(neighborNodesResult.data || [])];

    return { nodes, links };
  }

  /**
   * 分页获取图谱节点
   * @param graphId 图谱ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getNodesByGraphIdWithPagination(graphId: string, page: number = 1, limit: number = 50): Promise<{
    nodes: GraphNode[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;
    
    // 获取节点总数
    const countResult = await this.supabase.from('graph_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('graph_id', graphId);

    // 获取节点数据
    const nodesResult = await this.supabase.from('graph_nodes')
      .select('*')
      .eq('graph_id', graphId)
      .order('connections', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    const total = countResult.count || 0;
    const nodes = nodesResult.data || [];
    const hasMore = offset + nodes.length < total;

    return { nodes, total, hasMore };
  }

  /**
   * 分页获取图谱链接
   * @param graphId 图谱ID
   * @param page 页码
   * @param limit 每页数量
   */
  async getLinksByGraphIdWithPagination(graphId: string, page: number = 1, limit: number = 100): Promise<{
    links: GraphLink[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;
    
    // 获取链接总数
    const countResult = await this.supabase.from('graph_links')
      .select('id', { count: 'exact', head: true })
      .eq('graph_id', graphId);

    // 获取链接数据
    const linksResult = await this.supabase.from('graph_links')
      .select('*')
      .eq('graph_id', graphId)
      .order('weight', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    const total = countResult.count || 0;
    const links = linksResult.data || [];
    const hasMore = offset + links.length < total;

    return { links, total, hasMore };
  }

  /**
   * 创建图谱
   * @param graphData 图谱数据
   */
  async createGraph(graphData: {
    title: string;
    is_template?: boolean;
    visibility?: 'public' | 'unlisted';
    author_name?: string;
    author_email?: string;
    author_url?: string;
  }): Promise<Graph | null> {
    const graphRecord = {
      title: graphData.title,
      is_template: graphData.is_template || false,
      visibility: graphData.visibility || 'unlisted',
      author_name: graphData.author_name || 'Anonymous',
      author_email: graphData.author_email,
      author_url: graphData.author_url,
      graph_data: {}
    };

    const result = await this.supabase.from(this.TABLE_NAME).insert(graphRecord).select('*').single<Graph>();
    return result.data || null;
  }

  /**
   * 更新图谱
   * @param graphId 图谱ID
   * @param updates 更新数据
   */
  async updateGraph(graphId: string, updates: Partial<{
    title: string;
    is_template: boolean;
    visibility: 'public' | 'unlisted';
    graph_data: {
      nodes: Array<Record<string, unknown>>;
      links: Array<Record<string, unknown>>;
    };
  }>): Promise<Graph | null> {
    const now = new Date();
    const nowISO = now.toISOString();

    // 获取当前图谱信息以计算编辑限制
    const currentGraph = await this.getGraphById(graphId);

    // 计算编辑限制状态
    const editLimitStatus = calculateEditLimitStatus(
      currentGraph?.edit_count_24h || 0,
      currentGraph?.edit_count_7d || 0,
      currentGraph?.last_edit_date
    );

    // 构建最终更新对象，包含编辑限制字段
    const finalUpdates = buildUpdateWithEditLimit(
      {
        ...updates,
        updated_at: nowISO
      },
      editLimitStatus
    );

    const result = await this.supabase.from(this.TABLE_NAME).update(finalUpdates).eq('id', graphId).select('*').single<Graph>();
    return result.data || null;
  }

  /**
   * 删除图谱
   * @param graphId 图谱ID
   */
  async deleteGraph(graphId: string): Promise<boolean> {
    try {
      // 删除图谱
      const graphResult = await this.supabase.from(this.TABLE_NAME).delete().eq('id', graphId);
      
      if (graphResult.error) {
        throw new Error('Failed to delete graph');
      }

      // 删除关联的节点
      await this.supabase.from('graph_nodes').delete().eq('graph_id', graphId);
      
      // 删除关联的链接
      await this.supabase.from('graph_links').delete().eq('graph_id', graphId);
      
      return true;
    } catch (err) {
      this.handleError(err, 'GraphService', '删除图谱');
      return false;
    }
  }

  /**
   * 创建图谱节点
   * @param nodeData 节点数据
   */
  async createNode(nodeData: {
    graph_id: string;
    title: string;
    type?: 'article' | 'concept' | 'resource';
    description?: string;
    content?: string;
    color?: string;
    size?: number;
    x?: number;
    y?: number;
    z?: number;
  }): Promise<GraphNode | null> {
    const tableName = 'graph_nodes';

    const nodeRecord = {
      graph_id: nodeData.graph_id,
      title: nodeData.title,
      type: nodeData.type || 'concept',
      description: nodeData.description,
      content: nodeData.content,
      color: nodeData.color || 'var(--neutral-500)',
      size: nodeData.size || 20,
      x: nodeData.x || 0,
      y: nodeData.y || 0,
      z: nodeData.z || 0,
      connections: 0
    };

    const result = await this.supabase.from(tableName).insert(nodeRecord).select('*').single<GraphNode>();
    return result.data || null;
  }

  /**
   * 创建图谱链接
   * @param linkData 链接数据
   */
  async createLink(linkData: {
    graph_id: string;
    source_id: string;
    target_id: string;
    type?: string;
    label?: string;
    weight?: number;
    color?: string;
  }): Promise<GraphLink | null> {
    const tableName = 'graph_links';

    const linkRecord = {
      graph_id: linkData.graph_id,
      source_id: linkData.source_id,
      target_id: linkData.target_id,
      type: linkData.type || 'related',
      label: linkData.label,
      weight: linkData.weight || 1.0,
      color: linkData.color || 'var(--neutral-400)'
    };

    const result = await this.supabase.from(tableName).insert(linkRecord).select('*').single<GraphLink>();
    return result.data || null;
  }

  /**
   * 创建文章-节点映射
   * @param articleId 文章ID
   * @param nodeId 节点ID
   * @param mappingType 映射类型
   */
  async createArticleNodeMapping(articleId: string, nodeId: string, mappingType: string = 'primary') {
    const tableName = 'article_node_mappings';

    const mappingRecord = {
      article_id: articleId,
      node_id: nodeId,
      mapping_type: mappingType
    };

    const result = await this.supabase.from(tableName).insert(mappingRecord).select('*').single();
    return result.data;
  }

  /**
   * 获取文章关联的节点
   * @param articleId 文章ID
   */
  async getNodesByArticleId(articleId: string): Promise<GraphNode[]> {
    const result = await this.supabase.from('article_node_mappings')
      .select('node:node_id(*)')
      .eq('article_id', articleId);
    
    const data = result.data || [];
    return data
      .filter(item => item?.node !== undefined && typeof item.node === 'object' && !Array.isArray(item.node))
      .map(item => {
        const node = item.node as unknown;
        return node as GraphNode;
      });
  }

  /**
   * 获取节点关联的文章
   * @param nodeId 节点ID
   */
  async getArticlesByNodeId(nodeId: string): Promise<Article[]> {
    const result = await this.supabase.from('article_node_mappings')
      .select('article:article_id(*)')
      .eq('node_id', nodeId);
    
    const data = result.data || [];
    return data
      .filter(item => item?.article !== undefined && typeof item.article === 'object' && !Array.isArray(item.article))
      .map(item => {
        const article = item.article as unknown;
        return article as Article;
      });
  }

  /**
   * 删除文章-节点映射
   * @param articleId 文章ID
   * @param nodeId 节点ID
   */
  async deleteArticleNodeMapping(articleId: string, nodeId: string): Promise<boolean> {
    const tableName = 'article_node_mappings';

    try {
      await this.supabase.from(tableName)
        .delete()
        .eq('article_id', articleId)
        .eq('node_id', nodeId);
      
      return true;
    } catch (err) {
      this.handleError(err, 'GraphService', '删除文章-节点映射');
      return false;
    }
  }

  /**
   * 获取所有图谱分类
   */
  async getAllCategories() {
    const tableName = 'graph_categories';
    
    const result = await this.supabase.from(tableName).select('*');
    return result.data || [];
  }

  /**
   * 获取分类下的图谱
   * @param categoryId 分类ID
   */
  async getGraphsByCategory(categoryId: string): Promise<Graph[]> {
    const result = await this.supabase.from(this.TABLE_NAME)
      .select('*')
      .eq('category_id', categoryId)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });
    
    return result.data || [];
  }

  /**
   * 导出图谱数据
   * @param graphId 图谱ID
   */
  async exportGraph(graphId: string): Promise<{
    id: string;
    title: string;
    nodes: GraphNode[];
    links: GraphLink[];
    created_at: string;
    updated_at: string;
  } | null> {
    const graph = await this.getGraphById(graphId);
    if (!graph) return null;

    return {
      id: graph.id,
      title: graph.title,
      nodes: graph.nodes,
      links: graph.links,
      created_at: graph.created_at,
      updated_at: graph.updated_at
    };
  }

  /**
   * 导入图谱数据
   * @param graphData 图谱数据
   */
  async importGraph(graphData: {
    title: string;
    nodes: Array<Record<string, unknown>>;
    links: Array<Record<string, unknown>>;
    visibility?: 'public' | 'unlisted';
  }): Promise<Graph | null> {
    try {
      // 创建图谱
      const graph = await this.createGraph({
        title: graphData.title,
        visibility: graphData.visibility || 'unlisted',
        is_template: false
      });

      if (!graph) {
        throw new Error('Failed to create graph');
      }

      // 创建节点映射，用于处理链接
      const nodeIdMap: Record<string, string> = {};

      // 创建节点
      for (const node of graphData.nodes) {
        const createdNode = await this.createNode({
          graph_id: graph.id,
          title: (node as Record<string, unknown>).title as string || 'Untitled Node',
          type: (node as Record<string, unknown>).type as 'article' | 'concept' | 'resource' || 'concept',
          description: (node as Record<string, unknown>).description as string || '',
          content: (node as Record<string, unknown>).content as string || '',
          color: (node as Record<string, unknown>).color as string || 'var(--neutral-500)',
          size: (node as Record<string, unknown>).size as number || 20,
          x: (node as Record<string, unknown>).x as number || 0,
          y: (node as Record<string, unknown>).y as number || 0,
          z: (node as Record<string, unknown>).z as number || 0
        });

        if (createdNode) {
          nodeIdMap[(node as Record<string, unknown>).id as string] = createdNode.id;
        }
      }

      // 创建链接
      for (const link of graphData.links) {
        const sourceId = nodeIdMap[(link as Record<string, unknown>).source as string];
        const targetId = nodeIdMap[(link as Record<string, unknown>).target as string];

        if (sourceId && targetId) {
          await this.createLink({
            graph_id: graph.id,
            source_id: sourceId,
            target_id: targetId,
            type: (link as Record<string, unknown>).type as string || 'related',
            label: (link as Record<string, unknown>).label as string || '',
            weight: (link as Record<string, unknown>).weight as number || 1.0,
            color: (link as Record<string, unknown>).color as string || 'var(--neutral-400)'
          });
        }
      }

      return graph;
    } catch (err) {
      this.handleError(err, 'GraphService', '导入图谱');
      return null;
    }
  }

  /**
   * 自动生成图谱，基于文章内容
   * @param articleId 文章ID
   * @param title 图谱标题
   * @param visibility 图谱可见性
   */
  async autoGenerateGraph(articleId: string, title: string, visibility: 'public' | 'unlisted' = 'unlisted'): Promise<Graph | null> {
    try {
      // 创建图谱
      const graph = await this.createGraph({
        title: title,
        visibility: visibility,
        is_template: false
      });

      if (!graph) {
        throw new Error('Failed to create graph');
      }

      // 获取文章内容
      const { data: article } = await this.supabase
        .from('articles')
        .select('title, content, tags, summary')
        .eq('id', articleId)
        .single();

      if (!article) {
        throw new Error('Failed to get article');
      }

      // 提取关键词和概念（增强版，使用TF-IDF算法）
      const concepts = this.extractConcepts(article.content, article.tags || []);
      
      // 创建节点映射
      const nodeIdMap: Record<string, string> = {};

      // 创建文章节点
      const articleNode = await this.createNode({
        graph_id: graph.id,
        title: article.title,
        type: 'article',
        description: article.summary || '',
        content: article.content,
        color: 'var(--primary-500)',
        size: 30
      });

      if (articleNode) {
        nodeIdMap['article'] = articleNode.id;
      }

      // 创建概念节点
      for (const concept of concepts) {
        const createdNode = await this.createNode({
          graph_id: graph.id,
          title: concept.text,
          type: 'concept',
          description: concept.description,
          color: concept.color || 'var(--neutral-500)',
          size: 20
        });

        if (createdNode) {
          nodeIdMap[concept.text] = createdNode.id;
        }
      }

      // 创建链接：文章与概念之间的链接
      for (const concept of concepts) {
        const articleNodeId = nodeIdMap['article'];
        const conceptNodeId = nodeIdMap[concept.text];

        if (articleNodeId && conceptNodeId) {
          await this.createLink({
            graph_id: graph.id,
            source_id: articleNodeId,
            target_id: conceptNodeId,
            type: 'related',
            label: concept.relation || '提到',
            weight: concept.weight || 1.0
          });
        }
      }

      // 创建概念之间的链接
      for (let i = 0; i < concepts.length; i++) {
        for (let j = i + 1; j < concepts.length; j++) {
          // 如果概念在内容中相邻出现，创建链接
          const concept1 = concepts[i];
          const concept2 = concepts[j];
          
          if (concept1 && concept2) {
            const content = article.content.toLowerCase();
            const text1 = concept1.text.toLowerCase();
            const text2 = concept2.text.toLowerCase();

            if (content.includes(text1) && content.includes(text2)) {
              // 简单检查两个概念是否在200个字符内出现
              const index1 = content.indexOf(text1);
              const index2 = content.indexOf(text2);
              
              if (Math.abs(index1 - index2) < 200) {
                const nodeId1 = nodeIdMap[concept1.text];
                const nodeId2 = nodeIdMap[concept2.text];
                
                if (nodeId1 && nodeId2) {
                  await this.createLink({
                    graph_id: graph.id,
                    source_id: nodeId1,
                    target_id: nodeId2,
                    type: 'related',
                    label: '关联',
                    weight: 0.5
                  });
                }
              }
            }
          }
        }
      }

      // 创建文章-图谱映射
      await this.createArticleNodeMapping(articleId, nodeIdMap['article'] || '', 'primary');
      
      return graph;
    } catch (err) {
      this.handleError(err, 'GraphService', '自动生成图谱');
      return null;
    }
  }

  /**
   * 从文章内容中提取概念（增强版，使用TF-IDF算法）
   * @param content 文章内容
   * @param tags 文章标签
   */
  private extractConcepts(content: string, tags: Array<{ name: string }>): Array<{ text: string; weight: number; description: string; relation?: string; color?: string }> {
    // 增强版概念提取，使用TF-IDF算法
    const concepts: Array<{ text: string; weight: number; description: string; relation?: string; color?: string }> = [];
    
    // 从标签中提取概念
    const tagColors: readonly string[] = ['var(--success-500)', 'var(--warning-500)', 'var(--error-500)', 'var(--secondary-500)', 'var(--primary-500)'];
    
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      if (tag && tag.name) {
        concepts.push({
          text: tag.name as string,
          weight: 2.0,
          description: `文章标签: ${tag.name}`,
          color: tagColors[i % tagColors.length] as string
        });
      }
    }
    
    // 从内容中提取关键词（使用TF-IDF算法）
    const keywords = this.extractKeywords(content);
    
    for (const keyword of keywords) {
      if (!concepts.some(c => c.text === keyword.text)) {
        concepts.push({
          text: keyword.text,
          weight: keyword.weight,
          description: `文章中提到的概念: ${keyword.text}`,
          color: 'var(--neutral-500)'
        });
      }
    }
    
    return concepts;
  }

  /**
   * 提取关键词（使用TF-IDF算法）
   * @param content 文章内容
   * @param limit 关键词数量限制
   */
  private extractKeywords(content: string, limit: number = 10): Array<{ text: string; weight: number }> {
    // 停用词列表
    const stopWords = ['的', '了', '和', '是', '在', '有', '我', '这', '那', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们', '也', '还', '但', '却', '而', '就', '都', '只', '又', '很', '更', '最', '太', '非常', '极', '及', '与', '同', '并', '或', '若', '如', '因', '为', '所以', '由于', '因此', '但是', '不过', '然而', '可是', '虽然', '尽管', '即使', '如果', '假如', '倘若', '要是', '只要', '只有', '无论', '不管', '还是', '要么', '或者', '与其', '不如', '宁可', '宁愿', '也不'];
    
    // 简单分词和去停用词
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // 统计词频 (TF)
    const wordCounts: Record<string, number> = {};
    const totalWords = words.length;
    
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // 计算TF-IDF
    // 简化版：使用文档总数N=1，实际项目中可以使用更复杂的IDF计算
    const N = 1; // 文档总数，实际应用中应根据语料库计算
    const tfidfScores: Array<{ text: string; weight: number }> = [];
    
    for (const [word, freq] of Object.entries(wordCounts)) {
      // TF: 词频 / 总词数
      const tf = freq / totalWords;
      // IDF: 1 + log(N / (1 + 出现该词的文档数))，简化处理
      const idf = 1 + Math.log(N / (1 + 1));
      // TF-IDF 分数
      const tfidf = tf * idf;
      
      tfidfScores.push({
        text: word,
        weight: parseFloat(tfidf.toFixed(6))
      });
    }
    
    // 按TF-IDF分数排序，取前N个
    return tfidfScores
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
  }
}

// 导出单例实例
export const graphService = new GraphService();
