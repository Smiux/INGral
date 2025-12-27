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
  async getAllGraphs (visibility: 'public' | 'unlisted' = 'public'): Promise<Graph[]> {
    const result = await this.supabase.from(this.TABLE_NAME).select('*')
      .eq('visibility', visibility);
    return result.data || [];
  }

  /**
   * 获取图谱详情
   * @param graphId 图谱ID
   */
  async getGraphById (graphId: string): Promise<Graph | null> {
    // 获取图谱基本信息
    const graphResult = await this.supabase.from(this.TABLE_NAME).select('*')
      .eq('id', graphId)
      .single<Graph>();

    if (!graphResult.data) {
      return null;
    }

    // 获取图谱节点
    const nodesResult = await this.supabase.from('graph_nodes').select('*')
      .eq('graph_id', graphId);

    // 获取图谱链接
    const linksResult = await this.supabase.from('graph_links').select('*')
      .eq('graph_id', graphId);

    return {
      ...graphResult.data,
      'nodes': nodesResult.data || [],
      'links': linksResult.data || []
    };
  }

  /**
   * 分页获取图谱详情
   * @param graphId 图谱ID
   * @param options 分页选项
   */
  async getGraphByIdWithPagination (graphId: string, options: {
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
      ? await this.supabase.from(this.TABLE_NAME).select('*')
        .eq('id', graphId)
        .single<Graph>()
      : { 'data': { 'id': graphId, 'nodes': [], 'links': [] } as unknown as Graph };

    if (!graphResult.data) {
      return null;
    }

    // 分页获取图谱节点
    const nodesResult = await this.supabase.from('graph_nodes')
      .select('*')
      .eq('graph_id', graphId)
      .order('connections', { 'ascending': false })
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
      'nodes': nodesResult.data || [],
      'links': linksResult.data || []
    };
  }

  /**
   * 获取指定节点的邻居节点和链接
   * @param graphId 图谱ID
   * @param nodeId 节点ID
   */
  async getNeighborNodes (graphId: string, nodeId: string): Promise<{
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
      return { 'nodes': [], 'links': [] };
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
  async getNodesByGraphIdWithPagination (graphId: string, page: number = 1, limit: number = 50): Promise<{
    nodes: GraphNode[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // 获取节点总数
    const countResult = await this.supabase.from('graph_nodes')
      .select('id', { 'count': 'exact', 'head': true })
      .eq('graph_id', graphId);

    // 获取节点数据
    const nodesResult = await this.supabase.from('graph_nodes')
      .select('*')
      .eq('graph_id', graphId)
      .order('connections', { 'ascending': false })
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
  async getLinksByGraphIdWithPagination (graphId: string, page: number = 1, limit: number = 100): Promise<{
    links: GraphLink[];
    total: number;
    hasMore: boolean;
  }> {
    const offset = (page - 1) * limit;

    // 获取链接总数
    const countResult = await this.supabase.from('graph_links')
      .select('id', { 'count': 'exact', 'head': true })
      .eq('graph_id', graphId);

    // 获取链接数据
    const linksResult = await this.supabase.from('graph_links')
      .select('*')
      .eq('graph_id', graphId)
      .order('weight', { 'ascending': false })
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
  async createGraph (graphData: {
    title: string;
    visibility?: 'public' | 'unlisted';
    author_name?: string;
    author_email?: string;
    author_url?: string;
  }): Promise<Graph | null> {
    const graphRecord = {
      'title': graphData.title,
      'visibility': graphData.visibility || 'unlisted',
      'author_name': graphData.author_name || 'Anonymous',
      'author_email': graphData.author_email,
      'author_url': graphData.author_url,
      'graph_data': {}
    };

    const result = await this.supabase.from(this.TABLE_NAME).insert(graphRecord)
      .select('*')
      .single<Graph>();
    return result.data || null;
  }

  /**
   * 更新图谱
   * @param graphId 图谱ID
   * @param updates 更新数据
   */
  async updateGraph (graphId: string, updates: Partial<{
    title: string;
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
    const editLimitStatus = calculateEditLimitStatus({
      'currentEditCount24h': currentGraph?.edit_count_24h || 0,
      'currentEditCount7d': currentGraph?.edit_count_7d || 0,
      'lastEditDate': currentGraph?.last_edit_date ?? null
    });

    // 构建最终更新对象，包含编辑限制字段
    const finalUpdates = buildUpdateWithEditLimit(
      {
        ...updates,
        'updated_at': nowISO
      },
      editLimitStatus
    );

    const result = await this.supabase.from(this.TABLE_NAME).update(finalUpdates)
      .eq('id', graphId)
      .select('*')
      .single<Graph>();
    return result.data || null;
  }

  /**
   * 删除图谱
   * @param graphId 图谱ID
   */
  async deleteGraph (graphId: string): Promise<boolean> {
    try {
      // 删除图谱
      const graphResult = await this.supabase.from(this.TABLE_NAME).delete()
        .eq('id', graphId);

      if (graphResult.error) {
        throw new Error('Failed to delete graph');
      }

      // 删除关联的节点
      await this.supabase.from('graph_nodes').delete()
        .eq('graph_id', graphId);

      // 删除关联的链接
      await this.supabase.from('graph_links').delete()
        .eq('graph_id', graphId);

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
  async createNode (nodeData: {
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
      'graph_id': nodeData.graph_id,
      'title': nodeData.title,
      'type': nodeData.type || 'concept',
      'description': nodeData.description,
      'content': nodeData.content,
      'color': nodeData.color || 'var(--neutral-500)',
      'size': nodeData.size || 20,
      'x': nodeData.x || 0,
      'y': nodeData.y || 0,
      'z': nodeData.z || 0,
      'connections': 0
    };

    const result = await this.supabase.from(tableName).insert(nodeRecord)
      .select('*')
      .single<GraphNode>();
    return result.data || null;
  }

  /**
   * 创建图谱链接
   * @param linkData 链接数据
   */
  async createLink (linkData: {
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
      'graph_id': linkData.graph_id,
      'source_id': linkData.source_id,
      'target_id': linkData.target_id,
      'type': linkData.type || 'related',
      'label': linkData.label,
      'weight': linkData.weight || 1.0,
      'color': linkData.color || 'var(--neutral-400)'
    };

    const result = await this.supabase.from(tableName).insert(linkRecord)
      .select('*')
      .single<GraphLink>();
    return result.data || null;
  }

  /**
   * 创建文章-节点映射
   * @param articleId 文章ID
   * @param nodeId 节点ID
   * @param mappingType 映射类型
   */
  async createArticleNodeMapping (articleId: string, nodeId: string, mappingType: string = 'primary') {
    const tableName = 'article_node_mappings';

    const mappingRecord = {
      'article_id': articleId,
      'node_id': nodeId,
      'mapping_type': mappingType
    };

    const result = await this.supabase.from(tableName).insert(mappingRecord)
      .select('*')
      .single();
    return result.data;
  }

  /**
   * 获取文章关联的节点
   * @param articleId 文章ID
   */
  async getNodesByArticleId (articleId: string): Promise<GraphNode[]> {
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
  async getArticlesByNodeId (nodeId: string): Promise<Article[]> {
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
  async deleteArticleNodeMapping (articleId: string, nodeId: string): Promise<boolean> {
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
  async getAllCategories () {
    const tableName = 'graph_categories';

    const result = await this.supabase.from(tableName).select('*');
    return result.data || [];
  }

  /**
   * 获取分类下的图谱
   * @param categoryId 分类ID
   */
  async getGraphsByCategory (categoryId: string): Promise<Graph[]> {
    const result = await this.supabase.from(this.TABLE_NAME)
      .select('*')
      .eq('category_id', categoryId)
      .eq('visibility', 'public')
      .order('created_at', { 'ascending': false });

    return result.data || [];
  }

  /**
   * 导出图谱数据
   * @param graphId 图谱ID
   */
  async exportGraph (graphId: string): Promise<{
    id: string;
    title: string;
    nodes: GraphNode[];
    links: GraphLink[];
    created_at: string;
    updated_at: string;
  } | null> {
    const graph = await this.getGraphById(graphId);
    if (!graph) {
      return null;
    }

    return {
      'id': graph.id,
      'title': graph.title,
      'nodes': graph.nodes,
      'links': graph.links,
      'created_at': graph.created_at,
      'updated_at': graph.updated_at
    };
  }

  /**
   * 导入图谱数据
   * @param graphData 图谱数据
   */
  async importGraph (graphData: {
    title: string;
    nodes: Array<Record<string, unknown>>;
    links: Array<Record<string, unknown>>;
    visibility?: 'public' | 'unlisted';
  }): Promise<Graph | null> {
    try {
      // 创建图谱
      const graph = await this.createGraph({
        'title': graphData.title,
        'visibility': graphData.visibility || 'unlisted'
      });

      if (!graph) {
        throw new Error('Failed to create graph');
      }

      // 创建节点映射，用于处理链接
      const nodeIdMap: Record<string, string> = {};

      // 创建节点
      for (const node of graphData.nodes) {
        const createdNode = await this.createNode({
          'graph_id': graph.id,
          'title': (node as Record<string, unknown>).title as string || 'Untitled Node',
          'type': (node as Record<string, unknown>).type as 'article' | 'concept' | 'resource' || 'concept',
          'description': (node as Record<string, unknown>).description as string || '',
          'content': (node as Record<string, unknown>).content as string || '',
          'color': (node as Record<string, unknown>).color as string || 'var(--neutral-500)',
          'size': (node as Record<string, unknown>).size as number || 20,
          'x': (node as Record<string, unknown>).x as number || 0,
          'y': (node as Record<string, unknown>).y as number || 0,
          'z': (node as Record<string, unknown>).z as number || 0
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
            'graph_id': graph.id,
            'source_id': sourceId,
            'target_id': targetId,
            'type': (link as Record<string, unknown>).type as string || 'related',
            'label': (link as Record<string, unknown>).label as string || '',
            'weight': (link as Record<string, unknown>).weight as number || 1.0,
            'color': (link as Record<string, unknown>).color as string || 'var(--neutral-400)'
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
  async autoGenerateGraph (articleId: string, title: string, visibility: 'public' | 'unlisted' = 'unlisted'): Promise<Graph | null> {
    try {
      // 创建图谱
      const graph = await this.createGraph({
        title,
        visibility
      });

      if (!graph) {
        throw new Error('Failed to create graph');
      }

      // 获取文章内容
      const { 'data': article } = await this.supabase
        .from('articles')
        .select('title, content, summary')
        .eq('id', articleId)
        .single();

      if (!article) {
        throw new Error('Failed to get article');
      }

      // 提取关键词和概念（增强版，使用TF-IDF算法）
      const concepts = this.extractConcepts(article.content);

      // 创建节点映射
      const nodeIdMap: Record<string, string> = {};

      // 创建文章节点
      const articleNode = await this.createNode({
        'graph_id': graph.id,
        'title': article.title,
        'type': 'article',
        'description': article.summary || '',
        'content': article.content,
        'color': 'var(--primary-500)',
        'size': 30
      });

      if (articleNode) {
        nodeIdMap.article = articleNode.id;
      }

      // 创建概念节点
      for (const concept of concepts) {
        const createdNode = await this.createNode({
          'graph_id': graph.id,
          'title': concept.text,
          'type': 'concept',
          'description': concept.description,
          'color': concept.color || 'var(--neutral-500)',
          'size': 20
        });

        if (createdNode) {
          nodeIdMap[concept.text] = createdNode.id;
        }
      }

      // 创建链接：文章与概念之间的链接
      for (const concept of concepts) {
        const articleNodeId = nodeIdMap.article;
        const conceptNodeId = nodeIdMap[concept.text];

        if (articleNodeId && conceptNodeId) {
          await this.createLink({
            'graph_id': graph.id,
            'source_id': articleNodeId,
            'target_id': conceptNodeId,
            'type': 'related',
            'label': concept.relation || '提到',
            'weight': concept.weight || 1.0
          });
        }
      }

      // 创建概念之间的链接（优化版）
      if (concepts.length > 1) {
        const content = article.content.toLowerCase();

        // 预计算所有概念在内容中的位置，避免重复搜索
        const conceptPositions: Record<string, number[]> = {};
        for (const concept of concepts) {
          const text = concept.text.toLowerCase();
          const positions: number[] = [];
          let index = content.indexOf(text);

          while (index !== -1) {
            positions.push(index);
            index = content.indexOf(text, index + 1);
          }

          if (positions.length > 0) {
            conceptPositions[concept.text] = positions;
          }
        }

        // 创建概念对映射，避免重复处理
        const processedPairs = new Set<string>();

        // 只处理前10个最重要的概念，减少O(n^2)复杂度
        const topConcepts = concepts.slice(0, 10);

        // 辅助函数：检查两个位置数组是否有任何位置对在200个字符内
        const arePositionsClose = (positions1: number[], positions2: number[]): boolean => {
          for (const pos1 of positions1) {
            for (const pos2 of positions2) {
              if (Math.abs(pos1 - pos2) < 200) {
                return true;
              }
            }
          }
          return false;
        };

        // 辅助函数：检查两个概念是否应该连接
        const shouldConnectConcepts = (conceptA: typeof concepts[number], conceptB: typeof concepts[number]): boolean => {
          if (!conceptA || !conceptB) {
            return false;
          }

          const pairKey = `${conceptA.text}-${conceptB.text}`;
          if (processedPairs.has(pairKey)) {
            return false;
          }

          processedPairs.add(pairKey);

          const positions1 = conceptPositions[conceptA.text] || [];
          const positions2 = conceptPositions[conceptB.text] || [];

          // 检查是否有任何位置对在200个字符内
          return arePositionsClose(positions1, positions2);
        };

        // 辅助函数：创建概念之间的连接
        const createConceptLink = async (concept1: typeof concepts[number] | undefined, concept2: typeof concepts[number] | undefined) => {
          if (!concept1 || !concept2) {
            return;
          }
          if (!shouldConnectConcepts(concept1, concept2)) {
            return;
          }

          const nodeId1 = nodeIdMap[concept1.text];
          const nodeId2 = nodeIdMap[concept2.text];

          if (nodeId1 && nodeId2) {
            await this.createLink({
              'graph_id': graph.id,
              'source_id': nodeId1,
              'target_id': nodeId2,
              'type': 'related',
              'label': '关联',
              'weight': 0.5
            });
          }
        };

        // 检查概念之间的关联
        for (let i = 0; i < topConcepts.length; i += 1) {
          for (let j = i + 1; j < topConcepts.length; j += 1) {
            await createConceptLink(topConcepts[i], topConcepts[j]);
          }
        }
      }

      // 创建文章-图谱映射
      await this.createArticleNodeMapping(articleId, nodeIdMap.article || '', 'primary');

      return graph;
    } catch (err) {
      this.handleError(err, 'GraphService', '自动生成图谱');
      return null;
    }
  }

  /**
   * 从文章内容中提取概念（增强版，使用TF-IDF算法）
   * @param content 文章内容
   */
  private extractConcepts (content: string): Array<{ text: string; weight: number; description: string; relation?: string; color?: string }> {
    // 增强版概念提取，使用TF-IDF算法
    const concepts: Array<{ text: string; weight: number; description: string; relation?: string; color?: string }> = [];

    // 从内容中提取关键词（使用TF-IDF算法）
    const keywords = this.extractKeywords(content);

    for (const keyword of keywords) {
      concepts.push({
        'text': keyword.text,
        'weight': keyword.weight,
        'description': `文章中提到的概念: ${keyword.text}`,
        'color': 'var(--neutral-500)'
      });
    }

    return concepts;
  }

  /**
   * 提取关键词（使用TF-IDF算法）
   * @param content 文章内容
   * @param limit 关键词数量限制
   */
  private extractKeywords (content: string, limit: number = 15): Array<{ text: string; weight: number }> {
    // 扩展后的停用词列表
    const stopWords = new Set([
      '的', '了', '和', '是', '在', '有', '我', '这', '那', '你', '他', '她', '它',
      '我们', '你们', '他们', '她们', '它们', '也', '还', '但', '却', '而', '就',
      '都', '只', '又', '很', '更', '最', '太', '非常', '极', '及', '与', '同',
      '并', '或', '若', '如', '因', '为', '所以', '由于', '因此', '但是', '不过',
      '然而', '可是', '虽然', '尽管', '即使', '如果', '假如', '倘若', '要是',
      '只要', '只有', '无论', '不管', '还是', '要么', '或者', '与其', '不如',
      '宁可', '宁愿', '也不', '啊', '呀', '呢', '吧', '吗', '啦', '哦', '嗯',
      '哎', '唉', '喂', '咳', '嘿', '嘻', '哈', '哦', '哟', '哇', '呀', '啦',
      '呢', '吧', '吗', '了', '着', '过', '的', '地', '得', '所', '以', '之',
      '而', '与', '及', '或', '且', '但', '却', '然', '而', '乃', '则', '虽',
      '然', '纵', '然', '即', '使', '如', '若', '倘', '若', '假', '如', '假',
      '使', '只', '要', '只', '有', '除', '非', '无', '论', '不', '管', '任',
      '凭', '别', '特', '别', '非', '常', '十', '分', '很', '极', '其', '尤',
      '为', '更', '加', '最', '顶', '太', '过', '异', '常', '超', '级', '极',
      '端', '相', '当', '比', '较', '差', '不', '多', '大', '概', '也', '许',
      '或', '许', '恐', '怕', '难', '道', '难', '免', '必', '须', '务', '必',
      '应', '该', '可', '能', '会', '要', '想', '将', '即', '将', '正', '在',
      '已', '经', '曾', '经', '刚', '刚', '才', '刚', '恰', '好', '恰', '巧',
      '刚', '巧', '正', '好', '就', '是', '对', '于', '关', '于', '至', '于',
      '由', '于', '因', '为', '所', '以', '因', '此', '于', '是', '然', '后',
      '接', '着', '先', '后', '最', '初', '开', '始', '最', '终', '结', '果',
      '到', '底', '究', '竟', '难', '道', '难', '不成', '难', '怪', '反', '正',
      '事', '实', '上', '实', '际', '上', '说', '实', '话', '总', '之', '总',
      '的', '来', '说', '归', '根', '结', '底', '归', '根', '到', '底', '据',
      '说', '听', '说', '据', '悉', '了', '解', '知', '道', '明', '白', '清',
      '楚', '懂', '得', '认', '为', '觉', '得', '想', '法', '观', '点', '意',
      '见', '看', '法', '态', '度', '觉', '得', '感', '到', '觉', '着', '感',
      '受', '认', '为', '以', '为', '觉', '得', '想', '要', '希', '望', '期',
      '望', '盼', '望', '企', '盼', '渴', '望', '憧', '憬', '梦', '想', '希',
      '图', '企', '图', '试', '图', '试', '着', '尝', '试', '努', '力', '尽',
      '力', '竭', '力', '致', '力', '专', '心', '专', '注', '认', '真', '仔',
      '细', '精', '心', '周', '到', '全', '面', '完', '整', '完', '美', '美',
      '好', '优', '秀', '杰', '出', '卓', '越', '伟', '大', '高', '尚', '正',
      '直', '善', '良', '美', '丽', '漂', '亮', '帅', '气', '可', '爱', '迷',
      '人', '有', '趣', '有', '用', '有', '益', '有', '效', '有', '用', '实',
      '用', '实', '际', '有', '效', '有', '用', '真', '实', '可', '靠', '可',
      '信', '确', '实', '的', '确', '真', '的', '实', '在', '实', '际', '上',
      '事', '实', '上', '说', '实', '话', '诚', '实', '坦', '诚', '直', '率',
      '坦', '白', '真', '诚', '老', '实', '可', '信', '可', '靠', '可', '行',
      '可', '能', '会', '要', '想', '将', '即', '将', '正', '在', '已', '经',
      '曾', '经', '刚', '刚', '才', '刚', '恰', '好', '恰', '巧', '刚', '巧',
      '正', '好', '就', '是', '对', '于', '关', '于', '至', '于', '由', '于',
      '因', '为', '所', '以', '因', '此', '于', '是', '然', '后', '接', '着',
      '先', '后', '最', '初', '开', '始', '最', '终', '结', '果', '到', '底',
      '究', '竟', '难', '道', '难', '不成', '难', '怪', '反', '正', '事', '实',
      '上', '实', '际', '上', '说', '实', '话', '总', '之', '总', '的', '来',
      '说', '归', '根', '结', '底', '归', '根', '到', '底', '据', '说', '听',
      '说', '据', '悉', '了', '解', '知', '道', '明', '白', '清', '楚', '懂',
      '得', '认', '为', '觉', '得', '想', '法', '观', '点', '意', '见', '看',
      '法', '态', '度', '觉', '得', '感', '到', '觉', '着', '感', '受', '认',
      '为', '以', '为', '觉', '得', '想', '要', '希', '望', '期', '望', '盼',
      '望', '企', '盼', '渴', '望', '憧', '憬', '梦', '想', '希', '图', '企',
      '图', '试', '图', '试', '着', '尝', '试', '努', '力', '尽', '力', '竭',
      '力', '致', '力', '专', '心', '专', '注', '认', '真', '仔', '细', '精',
      '心', '周', '到', '全', '面', '完', '整', '完', '美', '美', '好', '优',
      '秀', '杰', '出', '卓', '越', '伟', '大', '高', '尚', '正', '直', '善',
      '良', '美', '丽', '漂', '亮', '帅', '气', '可', '爱', '迷', '人', '有',
      '趣', '有', '用', '有', '益', '有', '效', '有', '用', '实', '用', '实',
      '际', '有', '效', '有', '用', '真', '实', '可', '靠', '可', '信', '确',
      '实', '的', '确', '真', '的', '实', '在', '实', '际', '上', '事', '实',
      '上', '说', '实', '话', '诚', '实', '坦', '诚', '直', '率', '坦', '白',
      '真', '诚', '老', '实', '可', '信', '可', '靠', '可', '行', '可', '能',
      '会', '要', '想', '将', '即', '将', '正', '在', '已', '经', '曾', '经',
      '刚', '刚', '才', '刚', '恰', '好', '恰', '巧', '刚', '巧', '正', '好',
      // 数字和单位
      '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万', '亿',
      '个', '只', '条', '件', '张', '片', '本', '册', '页', '卷', '份', '支', '枝', '棵', '株',
      '根', '条', '块', '粒', '颗', '只', '个', '辆', '台', '架', '艘', '艘', '间', '栋', '座',
      '扇', '户', '道', '面', '堵', '堵', '头', '匹', '头', '群', '队', '堆', '批', '包', '捆',
      '束', '把', '串', '挂', '滴', '点', '线', '条', '股', '团', '片', '片', '层', '排', '列',
      '行', '列', '组', '队', '群', '批', '次', '种', '类', '样', '式', '款', '型', '号', '类',
      // 时间相关
      '年', '月', '日', '时', '分', '秒', '天', '周', '星期', '日', '小时', '分钟', '秒钟',
      '今天', '明天', '后天', '昨天', '前天', '上周', '本周', '下周', '上个月', '这个月', '下个月',
      '去年', '今年', '明年', '现在', '目前', '当前', '此时', '此刻', '刚才', '刚刚', '马上', '立刻',
      '立即', '即刻', '顿时', '顿时', '忽然', '突然', '瞬间', '刹那', '一会儿', '一下子', '不久',
      '很快', '稍后', '以后', '后来', '之后', '之前', '从前', '过去', '以往', '未来', '将来', '今后',
      // 英文停用词
      'a', 'an', 'the', 'and', 'or', 'but', 'not', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
      'to', 'of', 'in', 'on', 'at', 'with', 'by', 'for', 'from', 'about', 'against', 'between', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'in', 'out', 'on', 'off',
      'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
      'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should',
      'now'
    ]);

    // 改进的分词和去停用词
    // 保留中英文和数字
    const words = content
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && !stopWords.has(word));

    // 统计词频 (TF)
    const wordCounts: Record<string, number> = {};

    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }

    // 计算TF-IDF
    const tfidfScores: Array<{ text: string; weight: number }> = [];

    for (const [word, freq] of Object.entries(wordCounts)) {
      // TF: 词频 / 总词数，增加对数平滑
      const tf = 1 + Math.log10(freq);
      // 改进的IDF计算，考虑了单词长度作为额外权重
      // 更长的单词通常具有更强的语义信息
      const wordLengthFactor = Math.min(1.5, 1 + word.length / 10);
      // 简化的IDF，实际应用中应根据语料库计算
      // 假设有1000篇文档的语料库
      const idf = 1 + Math.log10(1000 / (1 + freq));
      // TF-IDF 分数，结合单词长度因子
      const tfidf = tf * idf * wordLengthFactor;

      tfidfScores.push({
        'text': word,
        'weight': parseFloat(tfidf.toFixed(6))
      });
    }

    // 按TF-IDF分数排序，取前N个
    return tfidfScores
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit);
  }

  /**
   * 比较两个图谱的差异（优化版）
   * @param graphId1 第一个图谱ID
   * @param graphId2 第二个图谱ID
   */
  async compareGraphs (graphId1: string, graphId2: string): Promise<{
    nodesAdded: GraphNode[];
    nodesRemoved: GraphNode[];
    nodesUpdated: Array<{ old: GraphNode; new: GraphNode }>;
    linksAdded: GraphLink[];
    linksRemoved: GraphLink[];
    linksUpdated: Array<{ old: GraphLink; new: GraphLink }>;
  } | null> {
    try {
      // 获取两个图谱的数据
      const [graph1, graph2] = await Promise.all([
        this.getGraphById(graphId1),
        this.getGraphById(graphId2)
      ]);

      if (!graph1 || !graph2) {
        return null;
      }

      // 节点比较
      const nodes1 = new Map(graph1.nodes.map(node => [node.id, node]));
      const nodes2 = new Map(graph2.nodes.map(node => [node.id, node]));

      // 添加的节点
      const nodesAdded = Array.from(nodes2.values()).filter(node => !nodes1.has(node.id));

      // 删除的节点
      const nodesRemoved = Array.from(nodes1.values()).filter(node => !nodes2.has(node.id));

      // 更新的节点（优化版：只比较关键属性，不使用JSON.stringify）
      const nodesUpdated: Array<{ old: GraphNode; new: GraphNode }> = [];
      nodes1.forEach((node1, id) => {
        const node2 = nodes2.get(id);
        if (node2) {
          // 只比较关键属性，避免全量比较
          const isUpdated =
            node1.title !== node2.title ||
            node1.type !== node2.type ||
            node1.description !== node2.description ||
            node1.color !== node2.color ||
            node1.size !== node2.size;

          if (isUpdated) {
            nodesUpdated.push({ 'old': node1, 'new': node2 });
          }
        }
      });

      // 链接比较
      // 使用source和target的组合作为链接的唯一标识
      const getLinkKey = (link: GraphLink) => `${link.source}-${link.target}-${link.type}`;

      // 预计算链接映射
      const links1 = new Map(graph1.links.map(link => [getLinkKey(link), link]));
      const links2 = new Map(graph2.links.map(link => [getLinkKey(link), link]));

      // 添加的链接
      const linksAdded = Array.from(links2.values()).filter(link => !links1.has(getLinkKey(link)));

      // 删除的链接
      const linksRemoved = Array.from(links1.values()).filter(link => !links2.has(getLinkKey(link)));

      // 更新的链接（优化版：只比较关键属性，不使用JSON.stringify）
      const linksUpdated: Array<{ old: GraphLink; new: GraphLink }> = [];
      links1.forEach((link1, key) => {
        const link2 = links2.get(key);
        if (link2) {
          // 只比较关键属性，避免全量比较
          const isUpdated =
            link1.label !== link2.label ||
            link1.weight !== link2.weight ||
            link1.color !== link2.color;

          if (isUpdated) {
            linksUpdated.push({ 'old': link1, 'new': link2 });
          }
        }
      });

      return {
        nodesAdded,
        nodesRemoved,
        nodesUpdated,
        linksAdded,
        linksRemoved,
        linksUpdated
      };
    } catch (err) {
      this.handleError(err, 'GraphService', '比较图谱');
      return null;
    }
  }
}

// 导出单例实例
export const graphService = new GraphService();
