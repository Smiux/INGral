import type { Article, Graph, GraphNode, GraphLink } from '../types';
import { GraphNodeType, GraphVisibility } from '../types';
import type { SemanticSearchResult } from './semanticSearchService';
import { renderMarkdown } from '../utils/markdown';
import { BaseService } from './baseService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * 导出服务类，提供文章导出功能
 */
export class ExportService extends BaseService {
  private static instance: ExportService;

  private constructor() {
    super();
  }

  /**
   * 使用jsPDF导出文章为PDF
   * @param article 文章对象
   */
  async exportArticleToPdfWithJsPdf(article: Article): Promise<void> {
    try {
      const htmlContent = await this.exportToHtml(article);
      
      // 创建一个临时的HTML元素
      const tempElement = document.createElement('div');
      tempElement.innerHTML = htmlContent;
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.width = '210mm';
      tempElement.style.backgroundColor = 'white';
      document.body.appendChild(tempElement);
      
      // 使用html2canvas将HTML转换为canvas
      const canvas = await html2canvas(tempElement, {
        scale: 2, // 提高分辨率
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // 清理临时元素
      document.body.removeChild(tempElement);
      
      // 创建PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      const position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      
      // 保存PDF
      const safeFilename = this.sanitizeFilename(article.title) + '.pdf';
      pdf.save(safeFilename);
    } catch (error) {
      console.error('使用jsPDF导出PDF失败:', error);
      throw new Error('使用jsPDF导出PDF失败');
    }
  }

  /**
   * 导出为LaTeX格式
   * @param article 文章对象
   * @returns LaTeX格式的文本
   */
  async exportToLatex(article: Article): Promise<string> {
    try {
      // 创建LaTeX内容
      const latexContent = `\\documentclass{article}
\\usepackage[UTF8]{ctex}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{hyperref}
\\usepackage{listings}
\\usepackage{color}
\\usepackage{geometry}
\\geometry{a4paper, top=2cm, bottom=2cm, left=2cm, right=2cm}

\\title{${article.title}}
\\author{${article.author_id || 'Unknown'}}
\\date{${new Date().toLocaleDateString()}}

\\begin{document}

\\maketitle

\\section*{元信息}
\\begin{tabular}{ll}
    \\textbf{作者ID:} & ${article.author_id || 'Unknown'} \\
    \\textbf{创建时间:} & ${article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'} \\
    \\textbf{更新时间:} & ${article.updated_at ? new Date(article.updated_at).toLocaleString() : 'N/A'}
\\end{tabular}

\\section*{内容}

${this.markdownToLatex(article.content)}

\\section*{标签}
${article.tags ? article.tags.map(tag => `\\#${tag}`).join(' ') : ''}

\\end{document}`;
      
      return latexContent;
    } catch (error) {
      console.error('导出LaTeX失败:', error);
      throw new Error('导出LaTeX失败');
    }
  }

  /**
   * 将Markdown转换为LaTeX格式
   * @param markdown Markdown文本
   * @returns LaTeX格式的文本
   */
  private markdownToLatex(markdown: string): string {
    try {
      // 简单的Markdown到LaTeX转换
      let latex = markdown;
      
      // 标题转换
      latex = latex.replace(/^#\s+(.*$)/gm, '\\section{$1}');
      latex = latex.replace(/^##\s+(.*$)/gm, '\\subsection{$1}');
      latex = latex.replace(/^###\s+(.*$)/gm, '\\subsubsection{$1}');
      
      // 段落转换
      latex = latex.replace(/^\s*\n\s*$/, '\\par');
      
      // 粗体和斜体转换
      latex = latex.replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}');
      latex = latex.replace(/\*(.*?)\*/g, '\\textit{$1}');
      
      // 代码块转换
      latex = latex.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `\\begin{lstlisting}[language=${lang || 'text'}]
${code}
\\end{lstlisting}`;
      });
      
      // 行内代码转换
      latex = latex.replace(/`(.*?)`/g, '\\texttt{$1}');
      
      // 列表转换
      latex = latex.replace(/^-\s+(.*$)/gm, '\\item $1');
      latex = latex.replace(/^\d+\.\s+(.*$)/gm, '\\item $1');
      latex = latex.replace(/(\\item.*?)(?=\\item|$)/gs, '\\begin{itemize}\n$1\\end{itemize}');
      
      // 引用转换
      latex = latex.replace(/^>\s+(.*$)/gm, '\\begin{quote}$1\\end{quote}');
      
      // 表格转换（简单实现）
      latex = latex.replace(/\|(.*?)\|\n\|(.*?)\|\n((?:\|.*?\|\n)*)/g, (_, headers, _separator, rows) => {
        const headerCols = headers.split('|').map((col: string) => col.trim()).filter((col: string) => col);
        const dataRows = rows.split('\n')
          .filter((row: string) => row.trim())
          .map((row: string) => row.split('|').map((col: string) => col.trim()).filter((col: string) => col));
        
        let tableLatex = '\\begin{table}[h]\n\\centering\n\\begin{tabular}{';
        
        // 添加表格列格式
        tableLatex += '|c'.repeat(headerCols.length) + '|\\\hline\n';
        
        // 添加表头
        tableLatex += headerCols.join('|') + '\\\hline\n';
        
        // 添加数据行
        dataRows.forEach((row: string[]) => {
          tableLatex += row.join('|') + '\\\hline\n';
        });
        
        tableLatex += '\\end{tabular}\n\\end{table}';
        
        return tableLatex;
      });
      
      return latex;
    } catch (error) {
      console.error('Markdown到LaTeX转换失败:', error);
      throw new Error('Markdown到LaTeX转换失败');
    }
  }

  /**
   * 导出文章为LaTeX文件
   * @param article 文章对象
   */
  async exportArticleToLatex(article: Article): Promise<void> {
    try {
      const latexContent = await this.exportToLatex(article);
      const safeFilename = this.sanitizeFilename(article.title) + '.tex';
      this.triggerDownload(latexContent, safeFilename, 'application/x-latex;charset=utf-8');
    } catch (error) {
      console.error('导出LaTeX文件失败:', error);
      throw new Error('导出LaTeX文件失败');
    }
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }
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
      const contentHtml = renderMarkdown(article.content).html || '';

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
      const safeFilename = this.sanitizeFilename(graph.title || 'knowledge-graph') + '.json';
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
      const safeFilename = this.sanitizeFilename(graph.title || 'knowledge-graph') + '.graphml';
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
      const safeFilename = this.sanitizeFilename(graph.title || 'knowledge-graph');

      // 检查浏览器是否支持CompressionStream API
      if (typeof CompressionStream !== 'undefined') {
        // 使用CompressionStream生成zip文件
        const zipContent = await this.generateZipFile({
          [`${safeFilename}_nodes.csv`]: nodesCsv,
          [`${safeFilename}_links.csv`]: linksCsv,
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
   * 将SVG元素转换为Canvas
   * @param svgElement SVG元素
   * @returns Canvas元素
   */
  private async svgToCanvas(svgElement: SVGSVGElement): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        // 克隆SVG元素，避免修改原始元素
        const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
        
        // 设置SVG的XML命名空间
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        // 获取SVG的尺寸
        const width = svgElement.clientWidth;
        const height = svgElement.clientHeight;
        
        // 设置SVG的尺寸属性
        svgClone.setAttribute('width', width.toString());
        svgClone.setAttribute('height', height.toString());
        svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
        
        // 转换SVG为XML字符串
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgClone);
        
        // 创建Data URL
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        
        // 创建Image元素
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // 创建Canvas元素
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // 绘制Image到Canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取Canvas上下文'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas);
        };
        
        img.onerror = () => {
          reject(new Error('无法加载SVG图像'));
        };
        
        // 设置Image的src
        img.src = svgDataUrl;
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 导出图谱为PNG图片
   * @param svgSelector 图谱SVG的选择器
   * @param filename 文件名
   */
  async exportGraphAsPng(svgSelector: string, filename: string): Promise<void> {
    try {
      // 获取SVG元素
      const svgElement = document.querySelector<SVGSVGElement>(svgSelector);
      if (!svgElement) {
        throw new Error('找不到图谱SVG元素');
      }
      
      // 转换SVG为Canvas
      const canvas = await this.svgToCanvas(svgElement);

      // 转换为PNG并下载
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('无法生成PNG文件');
        }
        this.triggerDownload(blob, filename, 'image/png');
      });
    } catch (error) {
      console.error('导出图谱PNG失败:', error);
      throw new Error('导出图谱PNG失败');
    }
  }

  /**
   * 导出图谱为PDF
   * @param svgSelector 图谱SVG的选择器
   * @param graph 图谱数据
   */
  async exportGraphAsPdf(svgSelector: string, graph: Graph): Promise<void> {
    try {
      // 获取SVG元素
      const svgElement = document.querySelector<SVGSVGElement>(svgSelector);
      if (!svgElement) {
        throw new Error('找不到图谱SVG元素');
      }
      
      // 转换SVG为Canvas
      const canvas = await this.svgToCanvas(svgElement);
      
      // 将Canvas转换为图片
      const imgData = canvas.toDataURL('image/png');
      
      // 创建PDF内容
      const pdfContent = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${graph.title || '知识图谱'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
              color: #333;
            }
            .graph-container {
              margin: 0 auto;
              max-width: 100%;
            }
            img {
              max-width: 100%;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .metadata {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <h1>${graph.title || '知识图谱'}</h1>
          <div class="graph-container">
            <img src="${imgData}" alt="知识图谱">
          </div>
          <div class="metadata">
            <p>节点数量: ${graph.nodes.length}</p>
            <p>链接数量: ${graph.links.length}</p>
            <p>创建时间: ${new Date(graph.created_at || Date.now()).toLocaleString()}</p>
            <p>更新时间: ${new Date(graph.updated_at || Date.now()).toLocaleString()}</p>
          </div>
          <div class="footer">
            本文导出自知识库系统 · ${new Date().toLocaleDateString()}
          </div>
        </body>
        </html>
      `;

      // 创建一个新窗口
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('无法打开打印窗口，请检查浏览器设置');
      }

      // 写入内容到新窗口
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // 等待内容加载完成后触发打印
      printWindow.onload = () => {
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
      console.error('导出图谱PDF失败:', error);
      throw new Error('导出图谱PDF失败');
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
        if (!nodeElement) {continue;}

        const id = nodeElement.getAttribute('id') || '';

        const nodeType = (this.extractGraphmlData(nodeElement, 'd2') || 'article') as keyof typeof GraphNodeType;
        const node: GraphNode = {
          id,
          title: this.extractGraphmlData(nodeElement, 'd0') || id,
          connections: parseInt(this.extractGraphmlData(nodeElement, 'd1') || '0', 10),
          type: GraphNodeType[nodeType],
          description: this.extractGraphmlData(nodeElement, 'd3') || '',
        };

        nodes.push(node);
      }

      // 解析链接
      const edgeElements = xmlDoc.getElementsByTagName('edge');
      for (let i = 0; i < edgeElements.length; i++) {
        const edgeElement = edgeElements[i];
        if (!edgeElement) {continue;}

        const source = edgeElement.getAttribute('source') || '';
        const target = edgeElement.getAttribute('target') || '';

        const link: GraphLink = {
          source,
          target,
          type: this.extractGraphmlData(edgeElement, 'd4') || 'related',
          label: this.extractGraphmlData(edgeElement, 'd5') || '',
          weight: parseFloat(this.extractGraphmlData(edgeElement, 'd6') || '1.0'),
        };

        links.push(link);
      }

      // 更新节点连接数
      nodes.forEach(node => {
        const connections = links.filter(link =>
          link.source === node.id || link.target === node.id,
        ).length;
        node.connections = connections;
      });

      return {
        id: `imported-${Date.now()}`,
        author_id: 'imported',
        author_name: 'Imported',
        title: 'Imported Graph',
        nodes,
        links,
        is_template: false,
        visibility: GraphVisibility.PUBLIC,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edit_count_24h: 0,
        edit_count_7d: 0,
        last_edit_date: new Date().toISOString(),
        is_change_public: true,
        is_slow_mode: false,
        is_unstable: false,
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
      },
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

  // 搜索结果导出功能

  /**
   * 导出搜索结果为JSON格式
   * @param results 搜索结果数组
   * @param query 搜索查询
   * @returns JSON格式的搜索结果
   */
  async exportSearchResultsToJson(
    results: SemanticSearchResult[],
    query: string
  ): Promise<string> {
    try {
      const exportData = {
        query,
        export_time: new Date().toISOString(),
        result_count: results.length,
        results
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('导出搜索结果JSON失败:', error);
      throw new Error('导出搜索结果JSON失败');
    }
  }

  /**
   * 导出搜索结果为CSV格式
   * @param results 搜索结果数组
   * @returns CSV格式的搜索结果
   */
  async exportSearchResultsToCsv(
    results: SemanticSearchResult[]
  ): Promise<string> {
    try {
      // CSV表头
      let csvContent = 'id,title,type,semantic_score,search_rank,matched_concepts\n';
      
      // 添加每一行数据
      results.forEach(result => {
        csvContent += `${result.id},"${this.escapeCsv(result.title)}",${result.type},${result.semantic_score},${result.search_rank || ''},"${this.escapeCsv(result.matched_concepts?.join(';') || '')}"\n`;
      });
      
      return csvContent;
    } catch (error) {
      console.error('导出搜索结果CSV失败:', error);
      throw new Error('导出搜索结果CSV失败');
    }
  }

  /**
   * 导出搜索结果为GraphML格式
   * @param results 搜索结果数组
   * @returns GraphML格式的搜索结果
   */
  async exportSearchResultsToGraphml(
    results: SemanticSearchResult[]
  ): Promise<string> {
    try {
      // 创建GraphML文件头部
      let graphmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns 
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">\n  <key id="d0" for="node" attr.name="title" attr.type="string"/>\n  <key id="d1" for="node" attr.name="type" attr.type="string"/>\n  <key id="d2" for="node" attr.name="semantic_score" attr.type="double"/>\n  <key id="d3" for="node" attr.name="search_rank" attr.type="int"/>\n  <key id="d4" for="node" attr.name="matched_concepts" attr.type="string"/>\n  <graph id="G" edgedefault="undirected">\n`;

      // 添加节点
      results.forEach(result => {
        graphmlContent += `    <node id="${result.id}">\n`;
        graphmlContent += `      <data key="d0">${this.escapeXml(result.title)}</data>\n`;
        graphmlContent += `      <data key="d1">${result.type}</data>\n`;
        graphmlContent += `      <data key="d2">${result.semantic_score}</data>\n`;
        
        if (result.search_rank) {
          graphmlContent += `      <data key="d3">${result.search_rank}</data>\n`;
        }
        
        if (result.matched_concepts && result.matched_concepts.length > 0) {
          graphmlContent += `      <data key="d4">${this.escapeXml(result.matched_concepts.join(';'))}</data>\n`;
        }
        
        graphmlContent += `    </node>\n`;
      });

      // 简单的链接生成：将匹配了相同概念的结果连接起来
      const conceptToResults = new Map<string, string[]>();
      results.forEach(result => {
        if (result.matched_concepts) {
          result.matched_concepts.forEach(concept => {
            if (!conceptToResults.has(concept)) {
              conceptToResults.set(concept, []);
            }
            conceptToResults.get(concept)?.push(result.id);
          });
        }
      });

      // 添加链接
      const addedLinks = new Set<string>();
      conceptToResults.forEach((conceptResults, concept) => {
        // 为每个概念组内的结果创建完全连接
        for (let i = 0; i < conceptResults.length; i++) {
          for (let j = i + 1; j < conceptResults.length; j++) {
            const source = conceptResults[i];
            const target = conceptResults[j];
            // 使用字符串比较生成唯一链接键，确保顺序一致
            if (source && target) {
              const linkKey = source < target ? `${source}-${target}` : `${target}-${source}`;
            
              if (!addedLinks.has(linkKey)) {
                addedLinks.add(linkKey);
                graphmlContent += `    <edge source="${source}" target="${target}">\n`;
                graphmlContent += `      <data key="d0">${concept}</data>\n`;
                graphmlContent += `    </edge>\n`;
              }
            }
          }
        }
      });

      // 关闭GraphML文件
      graphmlContent += `  </graph>\n</graphml>`;

      return graphmlContent;
    } catch (error) {
      console.error('导出搜索结果GraphML失败:', error);
      throw new Error('导出搜索结果GraphML失败');
    }
  }

  /**
   * 导出搜索结果为HTML（用于PDF导出）
   * @param results 搜索结果数组
   * @param query 搜索查询
   * @returns HTML格式的搜索结果
   */
  private createSearchResultsHtml(
    results: SemanticSearchResult[],
    query: string
  ): string {
    // 创建HTML内容
    return `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>搜索结果 - ${query}</title>\n  <style>\n    * {\n      box-sizing: border-box;\n      margin: 0;\n      padding: 0;\n    }\n    body {\n      font-family: 'Noto Serif SC', 'Times New Roman', serif;\n      line-height: 1.6;\n      color: #333;\n      background-color: #fff;\n      padding: 20px;\n      max-width: 210mm;\n      margin: 0 auto;\n    }\n    .paper {\n      background: white;\n      padding: 2cm;\n      box-shadow: 0 0 20px rgba(0,0,0,0.1);\n      margin-bottom: 20px;\n    }\n    h1 {\n      font-size: 2rem;\n      font-weight: 700;\n      color: #1a1a1a;\n      margin-bottom: 1rem;\n      text-align: center;\n    }\n    .query-info {\n      text-align: center;\n      color: #666;\n      margin-bottom: 2rem;\n      font-size: 1.1rem;\n    }\n    .result-count {\n      text-align: center;\n      color: #888;\n      margin-bottom: 2rem;\n      font-size: 0.9rem;\n    }\n    .result-item {\n      margin-bottom: 2rem;\n      padding-bottom: 1.5rem;\n      border-bottom: 1px solid #e0e0e0;\n    }\n    .result-item:last-child {\n      border-bottom: none;\n      margin-bottom: 0;\n      padding-bottom: 0;\n    }\n    .result-title {\n      font-size: 1.3rem;\n      font-weight: 600;\n      color: #2c3e50;\n      margin-bottom: 0.5rem;\n    }\n    .result-meta {\n      display: flex;\n      gap: 1rem;\n      font-size: 0.9rem;\n      color: #666;\n      margin-bottom: 0.5rem;\n    }\n    .result-type {\n      background-color: #e3f2fd;\n      color: #1976d2;\n      padding: 0.2rem 0.5rem;\n      border-radius: 4px;\n      font-size: 0.8rem;\n      font-weight: 500;\n    }\n    .result-score {\n      background-color: #e8f5e8;\n      color: #2e7d32;\n      padding: 0.2rem 0.5rem;\n      border-radius: 4px;\n      font-size: 0.8rem;\n      font-weight: 500;\n    }\n    .result-concepts {\n      margin-top: 0.5rem;\n      font-size: 0.9rem;\n      color: #757575;\n    }\n    .concept-tag {\n      background-color: #f5f5f5;\n      color: #616161;\n      padding: 0.15rem 0.4rem;\n      border-radius: 3px;\n      font-size: 0.8rem;\n      margin-right: 0.5rem;\n      margin-bottom: 0.3rem;\n      display: inline-block;\n    }\n    .footer {\n      margin-top: 3rem;\n      padding-top: 1rem;\n      border-top: 1px solid #e0e0e0;\n      text-align: center;\n      font-size: 0.875rem;\n      color: #999;\n    }\n  </style>\n</head>\n<body>\n  <div class="paper">\n    <h1>搜索结果</h1>\n    <div class="query-info">查询关键词："${query}"</div>\n    <div class="result-count">共找到 ${results.length} 条结果</div>\n    <div class="results-container">\n      ${results.map(result => `\n      <div class="result-item">\n        <div class="result-title">${this.escapeXml(result.title)}</div>\n        <div class="result-meta">\n          <span class="result-type">${result.type}</span>\n          <span class="result-score">语义分数: ${result.semantic_score.toFixed(4)}</span>\n          ${result.search_rank ? `<span class="result-score">搜索排名: ${result.search_rank}</span>` : ''}\n        </div>\n        ${result.matched_concepts && result.matched_concepts.length > 0 ? `\n        <div class="result-concepts">\n          <strong>匹配概念：</strong>\n          ${result.matched_concepts.map(concept => `<span class="concept-tag">${this.escapeXml(concept)}</span>`).join('')}\n        </div>` : ''}\n      </div>`).join('')}\n    </div>\n    <div class="footer">\n      搜索结果导出自知识库系统 · ${new Date().toLocaleDateString()}· ${new Date().toLocaleTimeString()}\n    </div>\n  </div>\n</body>\n</html>`;
  }

  /**
   * 导出搜索结果为PDF
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsToPdf(
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    try {
      const htmlContent = this.createSearchResultsHtml(results, query);

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
      console.error('导出搜索结果PDF失败:', error);
      throw new Error('导出搜索结果PDF失败');
    }
  }

  /**
   * 导出搜索结果为JSON文件
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsAsJsonFile(
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    try {
      const jsonContent = await this.exportSearchResultsToJson(results, query);
      const safeFilename = this.sanitizeFilename(`search-results-${query}`) + '.json';
      this.triggerDownload(jsonContent, safeFilename, 'application/json;charset=utf-8');
    } catch (error) {
      console.error('导出搜索结果JSON文件失败:', error);
      throw new Error('导出搜索结果JSON文件失败');
    }
  }

  /**
   * 导出搜索结果为CSV文件
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsAsCsvFile(
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    try {
      const csvContent = await this.exportSearchResultsToCsv(results);
      const safeFilename = this.sanitizeFilename(`search-results-${query}`) + '.csv';
      this.triggerDownload(csvContent, safeFilename, 'text/csv;charset=utf-8');
    } catch (error) {
      console.error('导出搜索结果CSV文件失败:', error);
      throw new Error('导出搜索结果CSV文件失败');
    }
  }

  /**
   * 导出搜索结果为GraphML文件
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsAsGraphmlFile(
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    try {
      const graphmlContent = await this.exportSearchResultsToGraphml(results);
      const safeFilename = this.sanitizeFilename(`search-results-${query}`) + '.graphml';
      this.triggerDownload(graphmlContent, safeFilename, 'application/xml;charset=utf-8');
    } catch (error) {
      console.error('导出搜索结果GraphML文件失败:', error);
      throw new Error('导出搜索结果GraphML文件失败');
    }
  }
}

// 导出单例
export const exportService = ExportService.getInstance();
