import { BaseService } from './baseService';
import type { Graph, GraphNode, GraphLink, Article } from '../types/index';

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

    // 构建最终更新对象
    const finalUpdates = {
      ...updates,
      'updated_at': nowISO
    };

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
