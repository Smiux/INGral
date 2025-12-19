import { GraphNodeType, GraphVisibility, type Graph, type GraphNode, type GraphLink } from '../../types';

/**
 * 知识图谱导入服务类，提供知识图谱导入功能
 */
export class GraphImportService {
  /**
   * 导入知识图谱数据
   * @param file 文件对象
   * @returns 解析后的图谱数据
   */
  async importGraphFromFile (file: File): Promise<Graph> {
    try {
      const fileExtension = file.name.split('.').pop()
        ?.toLowerCase();
      const fileContent = await this.readFileAsText(file);

      switch (fileExtension) {
        case 'json':
          return this.parseGraphJson(fileContent);
        case 'graphml':
          return this.parseGraphml(fileContent);
        default:
          throw new Error(`不支持的文件格式: ${fileExtension}`);
      }
    } catch (error) {
      console.error('导入图谱失败:', error);
      throw new Error('导入图谱失败');
    }
  }

  /**
   * 读取文件内容为文本
   * @param file 文件对象
   * @returns 文件内容
   */
  private async readFileAsText (file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * 解析JSON格式的图谱数据
   * @param jsonContent JSON内容
   * @returns 图谱数据
   */
  private parseGraphJson (jsonContent: string): Graph {
    try {
      const data = JSON.parse(jsonContent);

      // 验证图谱数据结构
      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('无效的图谱数据：缺少nodes数组');
      }

      if (!data.links || !Array.isArray(data.links)) {
        throw new Error('无效的图谱数据：缺少links数组');
      }

      return data as Graph;
    } catch (error) {
      console.error('解析JSON图谱失败:', error);
      throw new Error('解析JSON图谱失败');
    }
  }

  /**
   * 解析GraphML格式的图谱数据
   * @param graphmlContent GraphML内容
   * @returns 图谱数据
   */
  private parseGraphml (graphmlContent: string): Graph {
    try {
      // 简单的GraphML解析，使用DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(graphmlContent, 'application/xml');

      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];

      // 解析节点
      const nodeElements = xmlDoc.getElementsByTagName('node');
      for (let i = 0; i < nodeElements.length; i += 1) {
        const nodeElement = nodeElements[i];
        if (nodeElement) {
          const id = nodeElement.getAttribute('id') || '';

          const nodeType = (this.extractGraphmlData(nodeElement, 'd2') || 'article') as keyof typeof GraphNodeType;
          const node = {
            id,
            'title': this.extractGraphmlData(nodeElement, 'd0') || id,
            'connections': parseInt(this.extractGraphmlData(nodeElement, 'd1') || '0', 10),
            'type': GraphNodeType[nodeType],
            'description': this.extractGraphmlData(nodeElement, 'd3') || ''
          };

          nodes.push(node);
        }
      }

      // 解析链接
      const edgeElements = xmlDoc.getElementsByTagName('edge');
      for (let i = 0; i < edgeElements.length; i += 1) {
        const edgeElement = edgeElements[i];
        if (edgeElement) {
          const source = edgeElement.getAttribute('source') || '';
          const target = edgeElement.getAttribute('target') || '';

          const link = {
            source,
            target,
            'type': this.extractGraphmlData(edgeElement, 'd4') || 'related',
            'label': this.extractGraphmlData(edgeElement, 'd5') || '',
            'weight': parseFloat(this.extractGraphmlData(edgeElement, 'd6') || '1.0')
          };

          links.push(link);
        }
      }

      // 更新节点连接数
      nodes.forEach(node => {
        const connections = links.filter(link =>
          link.source === node.id || link.target === node.id
        ).length;
        node.connections = connections;
      });

      return {
        'id': `imported-${Date.now()}`,
        'author_id': 'imported',
        'author_name': 'Imported',
        'title': 'Imported Graph',
        nodes,
        links,
        'is_template': false,
        'visibility': GraphVisibility.PUBLIC,
        'created_at': new Date().toISOString(),
        'updated_at': new Date().toISOString(),
        'edit_count_24h': 0,
        'edit_count_7d': 0,
        'last_edit_date': new Date().toISOString(),
        'is_change_public': true,
        'is_slow_mode': false,
        'is_unstable': false
      };
    } catch (error) {
      console.error('解析GraphML图谱失败:', error);
      throw new Error('解析GraphML图谱失败');
    }
  }

  /**
   * 从GraphML元素中提取数据
   * @param element XML元素
   * @param key 数据键
   * @returns 提取的数据
   */
  private extractGraphmlData (element: Element, key: string): string | null {
    const dataElements = element.getElementsByTagName('data');
    for (let i = 0; i < dataElements.length; i += 1) {
      const dataElement = dataElements[i];
      if (dataElement && dataElement.getAttribute('key') === key) {
        return dataElement.textContent || null;
      }
    }
    return null;
  }
}
