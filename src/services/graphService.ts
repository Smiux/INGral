import { supabase } from '../lib/supabase';

/**
 * 图谱服务 - 处理图谱相关操作
 */
export const graphService = {
  /**
   * 获取所有图谱
   */
  async getAllGraphs(visibility: 'public' | 'private' = 'public') {
    const { data, error } = await supabase
      .from('user_graphs')
      .select('*')
      .eq('visibility', visibility)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching graphs:', error);
      return [];
    }

    return data;
  },

  /**
   * 获取图谱详情
   */
  async getGraphById(graphId: string) {
    const { data: graph, error: graphError } = await supabase
      .from('user_graphs')
      .select('*')
      .eq('id', graphId)
      .single();

    if (graphError) {
      console.error('Error fetching graph:', graphError);
      return null;
    }

    // 获取图谱节点
    const { data: nodes, error: nodesError } = await supabase
      .from('graph_nodes')
      .select('*')
      .eq('graph_id', graphId);

    if (nodesError) {
      console.error('Error fetching graph nodes:', nodesError);
      return null;
    }

    // 获取图谱链接
    const { data: links, error: linksError } = await supabase
      .from('graph_links')
      .select('*')
      .eq('graph_id', graphId);

    if (linksError) {
      console.error('Error fetching graph links:', linksError);
      return null;
    }

    return {
      ...graph,
      nodes,
      links
    };
  },

  /**
   * 创建图谱
   */
  async createGraph(graphData: {
    title: string;
    is_template?: boolean;
    visibility?: 'public' | 'private';
    author_name?: string;
    author_email?: string;
    author_url?: string;
  }) {
    const { data, error } = await supabase
      .from('user_graphs')
      .insert({
        title: graphData.title,
        is_template: graphData.is_template || false,
        visibility: graphData.visibility || 'private',
        author_name: graphData.author_name || 'Anonymous',
        author_email: graphData.author_email,
        author_url: graphData.author_url,
        graph_data: {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating graph:', error);
      return null;
    }

    return data;
  },

  /**
   * 更新图谱
   */
  async updateGraph(graphId: string, updates: Partial<{
    title: string;
    is_template: boolean;
    visibility: 'public' | 'private';
    graph_data: any;
  }>) {
    const { data, error } = await supabase
      .from('user_graphs')
      .update(updates)
      .eq('id', graphId)
      .select()
      .single();

    if (error) {
      console.error('Error updating graph:', error);
      return null;
    }

    return data;
  },

  /**
   * 删除图谱
   */
  async deleteGraph(graphId: string) {
    const { error } = await supabase
      .from('user_graphs')
      .delete()
      .eq('id', graphId);

    if (error) {
      console.error('Error deleting graph:', error);
      return false;
    }

    return true;
  },

  /**
   * 创建图谱节点
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
  }) {
    const { data, error } = await supabase
      .from('graph_nodes')
      .insert({
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating node:', error);
      return null;
    }

    return data;
  },

  /**
   * 创建图谱链接
   */
  async createLink(linkData: {
    graph_id: string;
    source_id: string;
    target_id: string;
    type?: string;
    label?: string;
    weight?: number;
    color?: string;
  }) {
    const { data, error } = await supabase
      .from('graph_links')
      .insert({
        graph_id: linkData.graph_id,
        source_id: linkData.source_id,
        target_id: linkData.target_id,
        type: linkData.type || 'related',
        label: linkData.label,
        weight: linkData.weight || 1.0,
        color: linkData.color || '#9CA3AF'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating link:', error);
      return null;
    }

    return data;
  },

  /**
   * 创建文章-节点映射
   */
  async createArticleNodeMapping(articleId: string, nodeId: string, mappingType: string = 'primary') {
    const { data, error } = await supabase
      .from('article_node_mappings')
      .insert({
        article_id: articleId,
        node_id: nodeId,
        mapping_type: mappingType
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating article-node mapping:', error);
      return null;
    }

    return data;
  },

  /**
   * 获取文章关联的节点
   */
  async getNodesByArticleId(articleId: string) {
    const { data, error } = await supabase
      .from('article_node_mappings')
      .select('node:node_id(*)')
      .eq('article_id', articleId);

    if (error) {
      console.error('Error fetching nodes by article:', error);
      return [];
    }

    return data.map(item => item.node);
  },

  /**
   * 获取节点关联的文章
   */
  async getArticlesByNodeId(nodeId: string) {
    const { data, error } = await supabase
      .from('article_node_mappings')
      .select('article:article_id(*)')
      .eq('node_id', nodeId);

    if (error) {
      console.error('Error fetching articles by node:', error);
      return [];
    }

    return data.map(item => item.article);
  },

  /**
   * 删除文章-节点映射
   */
  async deleteArticleNodeMapping(articleId: string, nodeId: string) {
    const { error } = await supabase
      .from('article_node_mappings')
      .delete()
      .eq('article_id', articleId)
      .eq('node_id', nodeId);

    if (error) {
      console.error('Error deleting article-node mapping:', error);
      return false;
    }

    return true;
  },

  /**
   * 获取所有图谱分类
   */
  async getAllCategories() {
    const { data, error } = await supabase
      .from('graph_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching graph categories:', error);
      return [];
    }

    return data;
  },

  /**
   * 获取分类下的图谱
   */
  async getGraphsByCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('user_graphs')
      .select('*')
      .eq('category_id', categoryId)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching graphs by category:', error);
      return [];
    }

    return data;
  },

  /**
   * 导出图谱数据
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
  },

  /**
   * 导入图谱数据
   */
  async importGraph(graphData: {
    title: string;
    nodes: any[];
    links: any[];
    visibility?: 'public' | 'private';
  }) {
    // 创建图谱
    const graph = await this.createGraph({
      title: graphData.title,
      visibility: graphData.visibility || 'private',
      is_template: false
    });

    if (!graph) return null;

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

    return graph;
  }
};
