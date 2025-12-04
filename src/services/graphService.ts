import { BaseService } from './baseService';
import type { Graph, GraphNode, GraphLink, Article } from '../types/index';

/**
 * 图谱服务类，处理图谱相关操作
 */
export class GraphService extends BaseService {
  private readonly TABLE_NAME = 'user_graphs';
  private readonly CACHE_PREFIX = 'graph';

  /**
   * 获取所有图谱
   * @param visibility 图谱可见性
   */
  async getAllGraphs(visibility: 'public' | 'unlisted' = 'public'): Promise<Graph[]> {
    const params = { visibility };
    return this.getList<Graph>(this.TABLE_NAME, this.CACHE_PREFIX, params, 3 * 60 * 1000);
  }

  /**
   * 获取图谱详情
   * @param graphId 图谱ID
   */
  async getGraphById(graphId: string): Promise<Graph | null> {
    const cacheKey = this.getCacheKey(this.CACHE_PREFIX, graphId);
    
    return this.queryWithCache<Graph | null>(cacheKey, 3 * 60 * 1000, async () => {
      // 获取图谱基本信息
      const graphResult = await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME).select('*').eq('id', graphId).single<Graph>();
      }, 3 * 60 * 1000);
      
      if (!graphResult.data) {
        return null;
      }

      // 获取图谱节点
      const nodesResult = await this.executeWithRetry(async () => {
        return this.supabase.from('graph_nodes').select('*').eq('graph_id', graphId);
      }, 3 * 60 * 1000);

      // 获取图谱链接
      const linksResult = await this.executeWithRetry(async () => {
        return this.supabase.from('graph_links').select('*').eq('graph_id', graphId);
      }, 3 * 60 * 1000);

      return {
        ...graphResult.data,
        nodes: nodesResult.data || [],
        links: linksResult.data || []
      };
    });
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

    return this.create<Graph>(this.TABLE_NAME, graphRecord, this.CACHE_PREFIX, 3 * 60 * 1000);
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
    graph_data: any;
  }>): Promise<Graph | null> {
    const now = new Date();
    const nowISO = now.toISOString();

    // 获取当前图谱信息以计算编辑限制
    const currentGraph = await this.getGraphById(graphId);

    // 计算编辑计数
    const editCount24h = (currentGraph?.edit_count_24h || 0) + 1;
    const editCount7d = (currentGraph?.edit_count_7d || 0) + 1;

    // 计算是否在24小时内和7天内
    const lastEditDate = currentGraph?.last_edit_date ? new Date(currentGraph.last_edit_date) : null;
    const isWithin24h = lastEditDate && (now.getTime() - lastEditDate.getTime() < 24 * 60 * 60 * 1000);
    const isWithin7d = lastEditDate && (now.getTime() - lastEditDate.getTime() < 7 * 24 * 60 * 60 * 1000);

    // 重置计数逻辑
    const finalEditCount24h = isWithin24h ? editCount24h : 1;
    const finalEditCount7d = isWithin7d ? editCount7d : 1;

    // 确定编辑限制状态
    const isChangePublic = finalEditCount24h > 3;
    const isSlowMode = finalEditCount24h > 3;
    const isUnstable = finalEditCount7d > 10;
    const slowModeUntil = isSlowMode ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined;

    // 构建最终更新对象，包含编辑限制字段
    const finalUpdates = {
      ...updates,
      updated_at: nowISO,
      // 编辑限制相关字段
      edit_count_24h: finalEditCount24h,
      edit_count_7d: finalEditCount7d,
      last_edit_date: nowISO,
      is_change_public: isChangePublic,
      is_slow_mode: isSlowMode,
      slow_mode_until: slowModeUntil,
      is_unstable: isUnstable,
    };

    return this.update<Graph>(this.TABLE_NAME, graphId, finalUpdates, this.CACHE_PREFIX, 3 * 60 * 1000);
  }

  /**
   * 删除图谱
   * @param graphId 图谱ID
   */
  async deleteGraph(graphId: string): Promise<boolean> {
    try {
      // 开始事务
      const transactionId = await this.startTransaction();

      try {
        // 删除图谱
        const result = await this.delete(this.TABLE_NAME, graphId, this.CACHE_PREFIX);
        
        if (!result) {
          throw new Error('Failed to delete graph');
        }

        // 删除关联的节点和链接
        await this.executeWithRetry(async () => {
          return this.supabase.from('graph_nodes').delete().eq('graph_id', graphId);
        }, 3 * 60 * 1000);

        await this.executeWithRetry(async () => {
          return this.supabase.from('graph_links').delete().eq('graph_id', graphId);
        }, 3 * 60 * 1000);

        // 提交事务
        await this.commitTransaction(transactionId);
        
        return true;
      } catch (err) {
        // 回滚事务
        await this.rollbackTransaction();
        this.handleError(err, 'GraphService', '删除图谱');
        return false;
      }
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
    const cachePrefix = 'graph_node';

    const nodeRecord = {
      graph_id: nodeData.graph_id,
      title: nodeData.title,
      type: nodeData.type || 'concept',
      description: nodeData.description,
      content: nodeData.content,
      color: nodeData.color || '#6B7280',
      size: nodeData.size || 20,
      x: nodeData.x || 0,
      y: nodeData.y || 0,
      z: nodeData.z || 0,
      connections: 0
    };

    const node = await this.create<GraphNode>(tableName, nodeRecord, cachePrefix, 3 * 60 * 1000);
    
    // 清除图谱详情缓存
    if (node) {
      this.invalidateCache(this.getCacheKey(this.CACHE_PREFIX, nodeData.graph_id));
    }
    
    return node;
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
    const cachePrefix = 'graph_link';

    const linkRecord = {
      graph_id: linkData.graph_id,
      source_id: linkData.source_id,
      target_id: linkData.target_id,
      type: linkData.type || 'related',
      label: linkData.label,
      weight: linkData.weight || 1.0,
      color: linkData.color || '#9CA3AF'
    };

    const link = await this.create<GraphLink>(tableName, linkRecord, cachePrefix, 3 * 60 * 1000);
    
    // 清除图谱详情缓存
    if (link) {
      this.invalidateCache(this.getCacheKey(this.CACHE_PREFIX, linkData.graph_id));
    }
    
    return link;
  }

  /**
   * 创建文章-节点映射
   * @param articleId 文章ID
   * @param nodeId 节点ID
   * @param mappingType 映射类型
   */
  async createArticleNodeMapping(articleId: string, nodeId: string, mappingType: string = 'primary') {
    const tableName = 'article_node_mappings';
    const cachePrefix = 'article_node_mapping';

    const mappingRecord = {
      article_id: articleId,
      node_id: nodeId,
      mapping_type: mappingType
    };

    return this.create(tableName, mappingRecord, cachePrefix, 5 * 60 * 1000);
  }

  /**
   * 获取文章关联的节点
   * @param articleId 文章ID
   */
  async getNodesByArticleId(articleId: string): Promise<GraphNode[]> {
    const cacheKey = `article_nodes:${articleId}`;
    
    return this.queryWithCache<GraphNode[]>(cacheKey, 5 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from('article_node_mappings')
          .select('node:node_id(*)')
          .eq('article_id', articleId);
      }, 5 * 60 * 1000);
      
      const data = result.data || [];
      return data
        .filter(item => item?.node !== undefined && typeof item.node === 'object' && !Array.isArray(item.node))
        .map(item => {
          const node = item.node as unknown;
          return node as GraphNode;
        });
    });
  }

  /**
   * 获取节点关联的文章
   * @param nodeId 节点ID
   */
  async getArticlesByNodeId(nodeId: string): Promise<Article[]> {
    const cacheKey = `node_articles:${nodeId}`;
    
    return this.queryWithCache<Article[]>(cacheKey, 5 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from('article_node_mappings')
          .select('article:article_id(*)')
          .eq('node_id', nodeId);
      }, 5 * 60 * 1000);
      
      const data = result.data || [];
      return data
        .filter(item => item?.article !== undefined && typeof item.article === 'object' && !Array.isArray(item.article))
        .map(item => {
          const article = item.article as unknown;
          return article as Article;
        });
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
      await this.executeWithRetry(async () => {
        return this.supabase.from(tableName)
          .delete()
          .eq('article_id', articleId)
          .eq('node_id', nodeId);
      }, 5 * 60 * 1000);
      
      // 清除相关缓存
      this.invalidateCache(`article_nodes:${articleId}`);
      this.invalidateCache(`node_articles:${nodeId}`);
      
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
    const cachePrefix = 'graph_category';
    
    return this.getList(tableName, cachePrefix, undefined, 5 * 60 * 1000);
  }

  /**
   * 获取分类下的图谱
   * @param categoryId 分类ID
   */
  async getGraphsByCategory(categoryId: string): Promise<Graph[]> {
    const cacheKey = `graphs:category:${categoryId}`;
    
    return this.queryWithCache<Graph[]>(cacheKey, 3 * 60 * 1000, async () => {
      const result = await this.executeWithRetry(async () => {
        return this.supabase.from(this.TABLE_NAME)
          .select('*')
          .eq('category_id', categoryId)
          .eq('visibility', 'public')
          .order('created_at', { ascending: false });
      }, 3 * 60 * 1000);
      
      return result.data || [];
    });
  }

  /**
   * 导出图谱数据
   * @param graphId 图谱ID
   */
  async exportGraph(graphId: string) {
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
    nodes: any[];
    links: any[];
    visibility?: 'public' | 'unlisted';
  }): Promise<Graph | null> {
    try {
      // 开始事务
      const transactionId = await this.startTransaction();

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
            title: node.title,
            type: node.type,
            description: node.description,
            content: node.content,
            color: node.color,
            size: node.size,
            x: node.x,
            y: node.y,
            z: node.z
          });

          if (createdNode) {
            nodeIdMap[node.id] = createdNode.id;
          }
        }

        // 创建链接
        for (const link of graphData.links) {
          const sourceId = nodeIdMap[link.source as string];
          const targetId = nodeIdMap[link.target as string];

          if (sourceId && targetId) {
            await this.createLink({
              graph_id: graph.id,
              source_id: sourceId,
              target_id: targetId,
              type: link.type,
              label: link.label,
              weight: link.weight,
              color: link.color
            });
          }
        }

        // 提交事务
        await this.commitTransaction(transactionId);
        
        return graph;
      } catch (err) {
        // 回滚事务
        await this.rollbackTransaction();
        this.handleError(err, 'GraphService', '导入图谱');
        return null;
      }
    } catch (err) {
      this.handleError(err, 'GraphService', '导入图谱');
      return null;
    }
  }
}

// 导出单例实例
export const graphService = new GraphService();

