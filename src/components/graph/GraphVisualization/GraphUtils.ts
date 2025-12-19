import type { EnhancedNode, EnhancedGraphConnection, SavedLayout } from './types';
import type { GraphTheme } from './ThemeTypes';

/**
 * 图谱可视化工具类，提供通用的工具方法
 */
export class GraphUtils {
  /**
   * 生成唯一ID
   * @param prefix ID前缀
   * @returns 唯一ID
   */
  static generateId (prefix: string = 'id'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  /**
   * 生成节点ID
   * @returns 节点ID
   */
  static generateNodeId (): string {
    return `node-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  /**
   * 生成链接ID
   * @returns 链接ID
   */
  static generateLinkId (): string {
    return `link-${Date.now()}-${Math.random().toString(36)
      .substr(2, 9)}`;
  }

  /**
   * 获取节点在数组中的索引
   * @param nodes 节点数组
   * @param id 节点ID
   * @returns 节点索引，未找到返回-1
   */
  static getNodeIndex (nodes: EnhancedNode[], id: string): number {
    return nodes.findIndex(node => node.id === id);
  }

  /**
   * 获取链接在数组中的索引
   * @param links 链接数组
   * @param id 链接ID
   * @returns 链接索引，未找到返回-1
   */
  static getLinkIndex (links: EnhancedGraphConnection[], id: string): number {
    return links.findIndex(link => link.id === id);
  }

  /**
   * 根据ID获取节点
   * @param nodes 节点数组
   * @param id 节点ID
   * @returns 节点对象，未找到返回undefined
   */
  static getNodeById (nodes: EnhancedNode[], id: string): EnhancedNode | undefined {
    return nodes.find(node => node.id === id);
  }

  /**
   * 根据ID获取链接
   * @param links 链接数组
   * @param id 链接ID
   * @returns 链接对象，未找到返回undefined
   */
  static getLinkById (links: EnhancedGraphConnection[], id: string): EnhancedGraphConnection | undefined {
    return links.find(link => link.id === id);
  }

  /**
   * 检查节点是否在框选区域内
   * @param node 节点对象
   * @param box 框选区域 {x1, y1, x2, y2}
   * @returns 是否在框选区域内
   */
  static isNodeInBox (
    node: EnhancedNode,
    box: { x1: number; y1: number; x2: number; y2: number }
  ): boolean {
    if (node.x === undefined || node.y === undefined) {
      return false;
    }

    const minX = Math.min(box.x1, box.x2);
    const maxX = Math.max(box.x1, box.x2);
    const minY = Math.min(box.y1, box.y2);
    const maxY = Math.max(box.y1, box.y2);

    return node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY;
  }

  /**
   * 从localStorage加载保存的布局
   * @returns 保存的布局数组
   */
  static loadSavedLayoutsFromLocalStorage (): SavedLayout[] {
    try {
      const savedLayoutsStr = localStorage.getItem('savedLayouts');
      if (savedLayoutsStr) {
        return JSON.parse(savedLayoutsStr);
      }
    } catch (error) {
      console.error('从localStorage加载布局失败:', error);
    }
    return [];
  }

  /**
   * 将保存的布局保存到localStorage
   * @param layouts 布局数组
   */
  static saveSavedLayoutsToLocalStorage (layouts: SavedLayout[]): void {
    try {
      localStorage.setItem('savedLayouts', JSON.stringify(layouts));
    } catch (error) {
      console.error('保存布局到localStorage失败:', error);
    }
  }

  /**
   * 从localStorage加载当前主题
   * @returns 当前主题
   */
  static loadCurrentThemeFromLocalStorage (): GraphTheme | null {
    try {
      const savedTheme = localStorage.getItem('graphCurrentTheme');
      if (savedTheme) {
        return JSON.parse(savedTheme);
      }
    } catch (error) {
      console.error('从localStorage加载主题失败:', error);
    }
    return null;
  }

  /**
   * 将当前主题保存到localStorage
   * @param theme 主题对象
   */
  static saveCurrentThemeToLocalStorage (theme: GraphTheme): void {
    try {
      localStorage.setItem('graphCurrentTheme', JSON.stringify(theme));
    } catch (error) {
      console.error('保存主题到localStorage失败:', error);
    }
  }

  /**
   * 转换导入的节点为EnhancedNode类型
   * @param nodes 导入的节点数组
   * @returns 转换后的EnhancedNode数组
   */
  static convertToEnhancedNodes (nodes: unknown[]): EnhancedNode[] {
    return nodes.map((node) => {
      const typedNode = node as Record<string, unknown>;
      return {
        'id': String(typedNode.id || GraphUtils.generateNodeId()),
        'title': (typedNode.title as string) || '新节点',
        'connections': (typedNode.connections as number) || 0,
        'x': Math.random() * 400 + 100,
        'y': Math.random() * 400 + 100,
        'type': (typedNode.type as string) || 'concept',
        'content': (typedNode.content as string) ?? '',
        'is_custom': true
      };
    });
  }

  /**
   * 转换导入的链接为EnhancedGraphLink类型
   * @param links 导入的链接数组
   * @returns 转换后的EnhancedGraphLink数组
   */
  static convertToEnhancedLinks (links: unknown[]): EnhancedGraphConnection[] {
    return links.map((link) => {
      const typedLink = link as Record<string, unknown>;
      const source = typedLink.source && typeof typedLink.source === 'object'
        ? String((typedLink.source as EnhancedNode).id)
        : String(typedLink.source);
      const target = typedLink.target && typeof typedLink.target === 'object'
        ? String((typedLink.target as EnhancedNode).id)
        : String(typedLink.target);

      return {
        'id': GraphUtils.generateLinkId(),
        'type': (typedLink.type as string) || 'related',
        source,
        target,
        'label': (typedLink.label as string) || '',
        'weight': (typedLink.weight as number) || 1.0
      };
    });
  }

  /**
   * 检查链接是否与指定节点相关
   * @param link 链接对象
   * @param nodeId 节点ID
   * @returns 是否相关
   */
  static isLinkRelatedToNode (link: EnhancedGraphConnection, nodeId: string): boolean {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as EnhancedNode).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as EnhancedNode).id;
    return sourceId === nodeId || targetId === nodeId;
  }

  /**
   * 检查链接源和目标是否有效
   * @param link 链接对象
   * @returns 是否有效
   */
  static isValidLink (link: EnhancedGraphConnection): boolean {
    const sourceValid = typeof link.source === 'string' || Boolean((link.source as EnhancedNode).id);
    const targetValid = typeof link.target === 'string' || Boolean((link.target as EnhancedNode).id);
    return sourceValid && targetValid;
  }
}
