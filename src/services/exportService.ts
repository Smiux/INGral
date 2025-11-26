import { Article, Graph, GraphNode, GraphLink } from '../types';
import { renderMarkdown } from '../utils/markdown';

/**
 * 导出服务类，提供文章导出功能
 */
class ExportService {
  /**
   * 导出为Markdown格式
   * @param article 文章对象
   * @returns Markdown格式的文本
   */
  async exportToMarkdown(article: Article): Promise<string> {
    try {
      // 创建Markdown内容
      const markdownContent = `# ${article.title}

## 元信息
作者ID: ${article.author_id || 'Unknown'}
创建时间: ${article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'}
        更新时间: ${article.updated_at ? new Date(article.updated_at).toLocaleString() : 'N/A'}

## 内容
${article.content}

## 标签
${article.tags ? article.tags.map(tag => `#${tag}`).join(' ') : ''}

---
*本文导出自知识库系统*`;

      return markdownContent;
    } catch (error) {
      console.error('导出Markdown失败:', error);
      throw new Error('导出Markdown失败');
    }
  }

  /**
   * 导出为HTML格式（为PDF导出做准备）
   * @param article 文章对象
   * @returns HTML格式的文本
   */
  async exportToHtml(article: Article): Promise<string> {
    try {
      // 渲染文章内容为HTML
      const contentHtml = renderMarkdown(article.content) || '';

      // 创建完整的HTML文档
      const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Noto Serif SC', 'Times New Roman', serif;
      line-height: 1.6;
      color: #333;
      background-color: #fff;
      padding: 20px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    .paper {
      background: white;
      padding: 2cm;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    
    h1 {
      font-size: 2.2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 1rem;
      line-height: 1.3;
    }
    
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
      margin-top: 2rem;
      margin-bottom: 1rem;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 0.5rem;
    }
    
    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #444;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }
    
    p {
      margin-bottom: 1rem;
      text-align: justify;
      text-indent: 2em;
    }
    
    .metadata {
      background-color: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 2rem;
      font-size: 0.9rem;
      color: #666;
    }
    
    .metadata p {
      margin-bottom: 0.5rem;
      text-indent: 0;
    }
    
    .metadata p:last-child {
      margin-bottom: 0;
    }
    
    .tags {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }
    
    .tag {
      display: inline-block;
      background-color: #e9ecef;
      color: #495057;
      padding: 0.25rem 0.75rem;
      border-radius: 16px;
      font-size: 0.875rem;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .footer {
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 0.875rem;
      color: #999;
    }
    
    /* 代码块样式 */
    pre {
      background-color: #f6f8fa;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      margin: 1rem 0;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.875rem;
    }
    
    code {
      background-color: #f6f8fa;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.875em;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
    }
    
    /* 列表样式 */
    ul, ol {
      margin: 1rem 0 1rem 2rem;
    }
    
    li {
      margin-bottom: 0.5rem;
      text-align: justify;
    }
    
    /* 引用样式 */
    blockquote {
      border-left: 4px solid #ddd;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #666;
      font-style: italic;
    }
    
    /* 表格样式 */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    
    /* 响应式设计 */
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }
      
      .paper {
        padding: 1cm;
      }
      
      h1 {
        font-size: 1.8rem;
      }
      
      h2 {
        font-size: 1.3rem;
      }
      
      h3 {
        font-size: 1.1rem;
      }
    }
  </style>
</head>
<body>
  <div class="paper">
    <!-- 标题 -->
    <h1>${article.title}</h1>
    
    <!-- 元信息 -->
    <div class="metadata">
      <p><strong>作者ID：</strong>${article.author_id || 'Unknown'}</p>
      <p><strong>创建时间：</strong>${article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'}</p>
        <p><strong>更新时间：</strong>${article.updated_at ? new Date(article.updated_at).toLocaleString() : 'N/A'}</p>
    </div>
    
    <!-- 文章内容 -->
    <div class="content">
      ${contentHtml}
    </div>
    
    <!-- 标签 -->
    <div class="tags">
      <strong>标签：</strong>
      ${article.tags ? article.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : '无'}
    </div>
    
    <!-- 页脚 -->
    <div class="footer">
      本文导出自知识库系统 · ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;

      return htmlContent;
    } catch (error) {
      console.error('导出HTML失败:', error);
      throw new Error('导出HTML失败');
    }
  }

  /**
   * 触发文件下载
   * @param content 文件内容（字符串或Blob）
   * @param filename 文件名
   * @param mimeType MIME类型
   */
  triggerDownload(content: string | Blob, filename: string, mimeType: string): void {
    try {
      // 创建Blob对象
      const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('文件下载失败:', error);
      throw new Error('文件下载失败');
    }
  }

  /**
   * 导出文章为Markdown文件
   * @param article 文章对象
   */
  async exportArticleToMarkdown(article: Article): Promise<void> {
    try {
      const markdownContent = await this.exportToMarkdown(article);
      // 清理文件名，移除特殊字符
      const safeFilename = this.sanitizeFilename(article.title) + '.md';
      this.triggerDownload(markdownContent, safeFilename, 'text/markdown;charset=utf-8');
    } catch (error) {
      console.error('导出Markdown文件失败:', error);
      throw new Error('导出Markdown文件失败');
    }
  }

  /**
   * 导出文章为HTML文件
   * @param article 文章对象
   */
  async exportArticleToHtml(article: Article): Promise<void> {
    try {
      const htmlContent = await this.exportToHtml(article);
      // 清理文件名，移除特殊字符
      const safeFilename = this.sanitizeFilename(article.title) + '.html';
      this.triggerDownload(htmlContent, safeFilename, 'text/html;charset=utf-8');
    } catch (error) {
      console.error('导出HTML文件失败:', error);
      throw new Error('导出HTML文件失败');
    }
  }

  /**
   * 导出文章为PDF（使用浏览器打印功能）
   * @param article 文章对象
   */
  async exportArticleToPdf(article: Article): Promise<void> {
    try {
      const htmlContent = await this.exportToHtml(article);
      
      // 创建一个新窗口
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('无法打开打印窗口，请检查浏览器设置');
      }
      
      // 写入内容到新窗口
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // 等待内容加载完成后触发打印
      printWindow.onload = () => {
        // 设置打印选项（暂时注释，需要时启用）
      // const printOptions = {
      //   marginsType: 1,
      //   pageSize: 'A4',
      //   printBackground: true
      // };
        
        // 尝试使用现代的打印API
        if (printWindow.matchMedia) {
          printWindow.matchMedia('print').addListener((mql) => {
            if (!mql.matches) {
              // 打印对话框关闭后关闭窗口
              setTimeout(() => printWindow.close(), 100);
            }
          });
        }
        
        // 触发打印
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
    } catch (error) {
      console.error('导出PDF失败:', error);
      throw new Error('导出PDF失败');
    }
  }

  /**
   * 清理文件名，移除特殊字符
   * @param filename 原始文件名
   * @returns 清理后的文件名
   */
  private sanitizeFilename(filename: string): string {
    // 移除或替换非法字符
    return filename
      .replace(/[<>:/|?*"\\]/g, '_') // 移除Windows文件名中的非法字符
      .replace(/\s+/g, ' ')           // 合并多个空格
      .trim()                         // 移除首尾空格
      .slice(0, 100);                 // 限制长度
  }

  // 知识图谱导出功能

  /**
   * 导出知识图谱为JSON格式
   * @param graph 图谱数据
   * @returns JSON格式的图谱数据
   */
  async exportGraphToJson(graph: Graph): Promise<string> {
    try {
      return JSON.stringify(graph, null, 2);
    } catch (error) {
      console.error('导出图谱JSON失败:', error);
      throw new Error('导出图谱JSON失败');
    }
  }

  /**
   * 导出知识图谱为GraphML格式
   * @param graph 图谱数据
   * @returns GraphML格式的图谱数据
   */
  async exportGraphToGraphml(graph: Graph): Promise<string> {
    try {
      // 创建GraphML文件头部
      let graphmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns 
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="title" attr.type="string"/>
  <key id="d1" for="node" attr.name="connections" attr.type="int"/>
  <key id="d2" for="node" attr.name="type" attr.type="string"/>
  <key id="d3" for="node" attr.name="description" attr.type="string"/>
  <key id="d4" for="edge" attr.name="type" attr.type="string"/>
  <key id="d5" for="edge" attr.name="label" attr.type="string"/>
  <key id="d6" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="undirected">`;

      // 添加节点
      graph.nodes.forEach((node: GraphNode) => {
        graphmlContent += `
    <node id="${node.id}">
      <data key="d0">${this.escapeXml(node.title)}</data>
      <data key="d1">${node.connections}</data>`;
        
        if (node.type) {
          graphmlContent += `
      <data key="d2">${node.type}</data>`;
        }
        
        if (node.description) {
          graphmlContent += `
      <data key="d3">${this.escapeXml(node.description)}</data>`;
        }
        
        graphmlContent += `
    </node>`;
      });

      // 添加链接
      graph.links.forEach((link: GraphLink) => {
        graphmlContent += `
    <edge source="${link.source}" target="${link.target}">
      <data key="d4">${link.type}</data>`;
        
        if (link.label) {
          graphmlContent += `
      <data key="d5">${this.escapeXml(link.label)}</data>`;
        }
        
        if (link.weight) {
          graphmlContent += `
      <data key="d6">${link.weight}</data>`;
        }
        
        graphmlContent += `
    </edge>`;
      });

      // 关闭GraphML文件
      graphmlContent += `
  </graph>
</graphml>`;

      return graphmlContent;
    } catch (error) {
      console.error('导出图谱GraphML失败:', error);
      throw new Error('导出图谱GraphML失败');
    }
  }

  /**
   * 导出知识图谱为CSV格式（节点和链接两个文件）
   * @param graph 图谱数据
   * @returns 包含节点和链接CSV数据的对象
   */
  async exportGraphToCsv(graph: Graph): Promise<{ nodesCsv: string; linksCsv: string }> {
    try {
      // 节点CSV
      let nodesCsv = 'id,title,connections,type,description\n';
      graph.nodes.forEach((node: GraphNode) => {
        nodesCsv += `${node.id},"${this.escapeCsv(node.title)}",${node.connections},${node.type || ''},"${this.escapeCsv(node.description || '')}"\n`;
      });

      // 链接CSV
      let linksCsv = 'source,target,type,label,weight\n';
      graph.links.forEach((link: GraphLink) => {
        linksCsv += `${link.source},${link.target},${link.type},"${this.escapeCsv(link.label || '')}",${link.weight || ''}\n`;
      });

      return { nodesCsv, linksCsv };
    } catch (error) {
      console.error('导出图谱CSV失败:', error);
      throw new Error('导出图谱CSV失败');
    }
  }

  /**
   * 导出图谱为JSON文件
   * @param graph 图谱数据
   */
  async exportGraphAsJsonFile(graph: Graph): Promise<void> {
    try {
      const jsonContent = await this.exportGraphToJson(graph);
      const safeFilename = this.sanitizeFilename(graph.name || 'knowledge-graph') + '.json';
      this.triggerDownload(jsonContent, safeFilename, 'application/json;charset=utf-8');
    } catch (error) {
      console.error('导出图谱JSON文件失败:', error);
      throw new Error('导出图谱JSON文件失败');
    }
  }

  /**
   * 导出图谱为GraphML文件
   * @param graph 图谱数据
   */
  async exportGraphAsGraphmlFile(graph: Graph): Promise<void> {
    try {
      const graphmlContent = await this.exportGraphToGraphml(graph);
      const safeFilename = this.sanitizeFilename(graph.name || 'knowledge-graph') + '.graphml';
      this.triggerDownload(graphmlContent, safeFilename, 'application/xml;charset=utf-8');
    } catch (error) {
      console.error('导出图谱GraphML文件失败:', error);
      throw new Error('导出图谱GraphML文件失败');
    }
  }

  /**
   * 导出图谱为CSV文件（生成zip包）
   * @param graph 图谱数据
   */
  async exportGraphAsCsvFiles(graph: Graph): Promise<void> {
    try {
      const { nodesCsv, linksCsv } = await this.exportGraphToCsv(graph);
      const safeFilename = this.sanitizeFilename(graph.name || 'knowledge-graph');
      
      // 检查浏览器是否支持CompressionStream API
      if (typeof CompressionStream !== 'undefined') {
        // 使用CompressionStream生成zip文件
        const zipContent = await this.generateZipFile({
          [`${safeFilename}_nodes.csv`]: nodesCsv,
          [`${safeFilename}_links.csv`]: linksCsv
        });
        
        this.triggerDownload(zipContent, `${safeFilename}_csv.zip`, 'application/zip');
      } else {
        // 不支持zip生成，分别下载两个文件
        this.triggerDownload(nodesCsv, `${safeFilename}_nodes.csv`, 'text/csv;charset=utf-8');
        this.triggerDownload(linksCsv, `${safeFilename}_links.csv`, 'text/csv;charset=utf-8');
      }
    } catch (error) {
      console.error('导出图谱CSV文件失败:', error);
      throw new Error('导出图谱CSV文件失败');
    }
  }

  /**
   * 导入知识图谱数据
   * @param file 文件对象
   * @returns 解析后的图谱数据
   */
  async importGraphFromFile(file: File): Promise<Graph> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
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
  private async readFileAsText(file: File): Promise<string> {
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
  private parseGraphJson(jsonContent: string): Graph {
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
  private parseGraphml(graphmlContent: string): Graph {
    try {
      // 简单的GraphML解析，使用DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(graphmlContent, 'application/xml');
      
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      
      // 解析节点
      const nodeElements = xmlDoc.getElementsByTagName('node');
      for (let i = 0; i < nodeElements.length; i++) {
        const nodeElement = nodeElements[i];
        if (!nodeElement) continue;
        
        const id = nodeElement.getAttribute('id') || '';
        
        const node: GraphNode = {
          id,
          title: this.extractGraphmlData(nodeElement, 'd0') || id,
          connections: parseInt(this.extractGraphmlData(nodeElement, 'd1') || '0', 10),
          type: (this.extractGraphmlData(nodeElement, 'd2') || 'article') as 'article' | 'concept' | 'resource',
          description: this.extractGraphmlData(nodeElement, 'd3') || ''
        };
        
        nodes.push(node);
      }
      
      // 解析链接
      const edgeElements = xmlDoc.getElementsByTagName('edge');
      for (let i = 0; i < edgeElements.length; i++) {
        const edgeElement = edgeElements[i];
        if (!edgeElement) continue;
        
        const source = edgeElement.getAttribute('source') || '';
        const target = edgeElement.getAttribute('target') || '';
        
        const link: GraphLink = {
          source,
          target,
          type: this.extractGraphmlData(edgeElement, 'd4') || 'related',
          label: this.extractGraphmlData(edgeElement, 'd5') || '',
          weight: parseFloat(this.extractGraphmlData(edgeElement, 'd6') || '1.0')
        };
        
        links.push(link);
      }
      
      // 更新节点连接数
      nodes.forEach(node => {
        const connections = links.filter(link => 
          link.source === node.id || link.target === node.id
        ).length;
        node.connections = connections;
      });
      
      return {
        id: `imported-${Date.now()}`,
        user_id: 'imported',
        name: 'Imported Graph',
        nodes,
        links,
        is_template: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
  private extractGraphmlData(element: Element, key: string): string | null {
    const dataElements = element.getElementsByTagName('data');
    for (let i = 0; i < dataElements.length; i++) {
      const dataElement = dataElements[i];
      if (dataElement && dataElement.getAttribute('key') === key) {
        return dataElement.textContent || null;
      }
    }
    return null;
  }

  /**
   * 生成Zip文件（使用CompressionStream API）
   * @param files 文件对象映射
   * @returns Zip文件内容
   */
  private async generateZipFile(files: Record<string, string>): Promise<Blob> {
    const stream = new ReadableStream({
      async start(controller) {
        // 简单的Zip文件生成（仅支持文本文件）
        // 注意：这是一个简化实现，不支持完整的Zip规范
        let offset = 0;
        const centralDirectory: string[] = [];
        
        for (const [filename, content] of Object.entries(files)) {
          // 文件头
          const fileHeader = new Uint8Array(30);
          fileHeader.set(new TextEncoder().encode('PK\x03\x04'), 0); // 签名
          fileHeader[4] = 0x14;
          fileHeader[5] = 0x00; // 版本
          fileHeader[6] = 0x00;
          fileHeader[7] = 0x00; // 标志
          fileHeader[8] = 0x00;
          fileHeader[9] = 0x00; // 压缩方法（存储）
          fileHeader[10] = 0x00;
          fileHeader[11] = 0x00; // 修改时间
          fileHeader[12] = 0x00;
          fileHeader[13] = 0x00; // 修改日期
          fileHeader[14] = 0x00;
          fileHeader[15] = 0x00;
          fileHeader[16] = 0x00;
          fileHeader[17] = 0x00; // CRC32
          fileHeader[18] = 0x00;
          fileHeader[19] = 0x00;
          fileHeader[20] = 0x00;
          fileHeader[21] = 0x00; // 压缩大小
          fileHeader[22] = 0x00;
          fileHeader[23] = 0x00;
          fileHeader[24] = 0x00;
          fileHeader[25] = 0x00; // 未压缩大小
          fileHeader[26] = filename.length & 0xFF;
          fileHeader[27] = (filename.length >> 8) & 0xFF; // 文件名长度
          fileHeader[28] = 0x00;
          fileHeader[29] = 0x00; // 额外字段长度
          
          controller.enqueue(fileHeader);
          offset += fileHeader.length;
          
          // 文件名
          const filenameBytes = new TextEncoder().encode(filename);
          controller.enqueue(filenameBytes);
          offset += filenameBytes.length;
          
          // 文件内容
          const contentBytes = new TextEncoder().encode(content);
          controller.enqueue(contentBytes);
          offset += contentBytes.length;
          
          // 记录到中央目录
          const centralDirRecord = new Uint8Array(46);
          centralDirRecord.set(new TextEncoder().encode('PK\x01\x02'), 0); // 签名
          centralDirRecord[4] = 0x14;
          centralDirRecord[5] = 0x00; // 版本
          centralDirRecord[6] = 0x14;
          centralDirRecord[7] = 0x00; // 版本所需
          centralDirRecord[8] = 0x00;
          centralDirRecord[9] = 0x00; // 标志
          centralDirRecord[10] = 0x00;
          centralDirRecord[11] = 0x00; // 压缩方法
          centralDirRecord[12] = 0x00;
          centralDirRecord[13] = 0x00; // 修改时间
          centralDirRecord[14] = 0x00;
          centralDirRecord[15] = 0x00; // 修改日期
          centralDirRecord[16] = 0x00;
          centralDirRecord[17] = 0x00;
          centralDirRecord[18] = 0x00;
          centralDirRecord[19] = 0x00; // CRC32
          centralDirRecord[20] = 0x00;
          centralDirRecord[21] = 0x00;
          centralDirRecord[22] = 0x00;
          centralDirRecord[23] = 0x00; // 压缩大小
          centralDirRecord[24] = 0x00;
          centralDirRecord[25] = 0x00;
          centralDirRecord[26] = 0x00;
          centralDirRecord[27] = 0x00; // 未压缩大小
          centralDirRecord[28] = filename.length & 0xFF;
          centralDirRecord[29] = (filename.length >> 8) & 0xFF; // 文件名长度
          centralDirRecord[30] = 0x00;
          centralDirRecord[31] = 0x00; // 额外字段长度
          centralDirRecord[32] = 0x00;
          centralDirRecord[33] = 0x00; // 文件注释长度
          centralDirRecord[34] = 0x00;
          centralDirRecord[35] = 0x00; // 磁盘号
          centralDirRecord[36] = 0x00;
          centralDirRecord[37] = 0x00; // 内部文件属性
          centralDirRecord[38] = 0x00;
          centralDirRecord[39] = 0x00;
          centralDirRecord[40] = 0x00;
          centralDirRecord[41] = 0x00; // 外部文件属性
          const fileOffset = offset - fileHeader.length - filenameBytes.length;
          centralDirRecord[42] = fileOffset & 0xFF;
          centralDirRecord[43] = (fileOffset >> 8) & 0xFF;
          centralDirRecord[44] = (fileOffset >> 16) & 0xFF;
          centralDirRecord[45] = (fileOffset >> 24) & 0xFF; // 本地文件头偏移
          
          centralDirectory.push(Array.from(centralDirRecord).map(b => String.fromCharCode(b)).join(''));
          centralDirectory.push(filename);
        }
        
        // 中央目录
        const centralDirectoryContent = centralDirectory.join('');
        const centralDirectoryBytes = new TextEncoder().encode(centralDirectoryContent);
        controller.enqueue(centralDirectoryBytes);
        
        // 中央目录结束
        const endOfCentralDirectory = new Uint8Array(22);
        endOfCentralDirectory.set(new TextEncoder().encode('PK\x05\x06'), 0); // 签名
        endOfCentralDirectory[4] = 0x00;
        endOfCentralDirectory[5] = 0x00; // 磁盘号
        endOfCentralDirectory[6] = 0x00;
        endOfCentralDirectory[7] = 0x00; // 中央目录开始磁盘
        const fileCount = Object.keys(files).length;
        endOfCentralDirectory[8] = fileCount & 0xFF;
        endOfCentralDirectory[9] = (fileCount >> 8) & 0xFF; // 本磁盘文件数
        endOfCentralDirectory[10] = fileCount & 0xFF;
        endOfCentralDirectory[11] = (fileCount >> 8) & 0xFF; // 总文件数
        endOfCentralDirectory[12] = centralDirectoryBytes.length & 0xFF;
        endOfCentralDirectory[13] = (centralDirectoryBytes.length >> 8) & 0xFF;
        endOfCentralDirectory[14] = (centralDirectoryBytes.length >> 16) & 0xFF;
        endOfCentralDirectory[15] = (centralDirectoryBytes.length >> 24) & 0xFF; // 中央目录大小
        endOfCentralDirectory[16] = offset & 0xFF;
        endOfCentralDirectory[17] = (offset >> 8) & 0xFF;
        endOfCentralDirectory[18] = (offset >> 16) & 0xFF;
        endOfCentralDirectory[19] = (offset >> 24) & 0xFF; // 中央目录偏移
        endOfCentralDirectory[20] = 0x00;
        endOfCentralDirectory[21] = 0x00; // 注释长度
        
        controller.enqueue(endOfCentralDirectory);
        controller.close();
      }
    });
    
    return new Response(stream).blob();
  }

  /**
   * 转义XML特殊字符
   * @param text 原始文本
   * @returns 转义后的文本
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 转义CSV特殊字符
   * @param text 原始文本
   * @returns 转义后的文本
   */
  private escapeCsv(text: string): string {
    return text
      .replace(/"/g, '""')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ');
  }
}

// 导出单例
export default new ExportService();
