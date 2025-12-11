import type { SemanticSearchResult } from '../semanticSearchService';
import { ExportUtils } from './ExportUtils';

/**
 * 搜索结果导出服务类，提供搜索结果导出功能
 */
export class SearchResultsExportService {
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
        csvContent += `${result.id},"${ExportUtils.escapeCsv(result.title)}",${result.type},${result.semantic_score},${result.search_rank || ''},"${ExportUtils.escapeCsv(result.matched_concepts?.join(';') || '')}"\n`;
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
      let graphmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" 
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns 
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="d0" for="node" attr.name="title" attr.type="string"/>
  <key id="d1" for="node" attr.name="type" attr.type="string"/>
  <key id="d2" for="node" attr.name="semantic_score" attr.type="double"/>
  <key id="d3" for="node" attr.name="search_rank" attr.type="int"/>
  <key id="d4" for="node" attr.name="matched_concepts" attr.type="string"/>
  <key id="d0" for="edge" attr.name="concept" attr.type="string"/>
  <graph id="G" edgedefault="undirected">
`;

      // 添加节点
      results.forEach(result => {
        graphmlContent += `    <node id="${result.id}">
`;
        graphmlContent += `      <data key="d0">${ExportUtils.escapeXml(result.title)}</data>
`;
        graphmlContent += `      <data key="d1">${result.type}</data>
`;
        graphmlContent += `      <data key="d2">${result.semantic_score}</data>
`;
        
        if (result.search_rank) {
          graphmlContent += `      <data key="d3">${result.search_rank}</data>
`;
        }
        
        if (result.matched_concepts && result.matched_concepts.length > 0) {
          graphmlContent += `      <data key="d4">${ExportUtils.escapeXml(result.matched_concepts.join(';'))}</data>
`;
        }
        
        graphmlContent += `    </node>
`;
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
                graphmlContent += `    <edge source="${source}" target="${target}">
`;
                graphmlContent += `      <data key="d0">${concept}</data>
`;
                graphmlContent += `    </edge>
`;
              }
            }
          }
        }
      });

      // 关闭GraphML文件
      graphmlContent += `  </graph>
</graphml>`;

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
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>搜索结果 - ${query}</title>
  <style>
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
      margin-bottom: 20px;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 1rem;
      text-align: center;
    }
    .query-info {
      text-align: center;
      color: #666;
      margin-bottom: 2rem;
      font-size: 1.1rem;
    }
    .result-count {
      text-align: center;
      color: #888;
      margin-bottom: 2rem;
      font-size: 0.9rem;
    }
    .result-item {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
    }
    .result-item:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .result-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }
    .result-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 0.5rem;
    }
    .result-type {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .result-score {
      background-color: #e8f5e8;
      color: #2e7d32;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .result-concepts {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #555;
    }
    .concept-tag {
      display: inline-block;
      background-color: #fff3e0;
      color: #e65100;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.8rem;
    }
    .footer {
      text-align: center;
      color: #999;
      font-size: 0.9rem;
      margin-top: 3rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="paper">
    <h1>搜索结果</h1>
    <div class="query-info">查询关键词：${query}</div>
    <div class="result-count">共找到 ${results.length} 条结果</div>
    
    ${results.map((result, index) => `
    <div class="result-item">
      <div class="result-title">${index + 1}. ${result.title}</div>
      <div class="result-meta">
        <span class="result-type">${result.type}</span>
        <span class="result-score">相关性：${result.semantic_score.toFixed(3)}</span>
        ${result.search_rank ? `<span>排名：${result.search_rank}</span>` : ''}
      </div>
      ${result.matched_concepts && result.matched_concepts.length > 0 ? `
      <div class="result-concepts">
        匹配概念：${result.matched_concepts.map(concept => `<span class="concept-tag">${concept}</span>`).join('')}
      </div>
      ` : ''}
    </div>
    `).join('')}
    
    <div class="footer">
      本文导出自知识库系统 · ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;
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
      const safeFilename = ExportUtils.sanitizeFilename(`search-results-${query}`) + '.json';
      ExportUtils.triggerDownload(jsonContent, safeFilename, 'application/json;charset=utf-8');
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
      const safeFilename = ExportUtils.sanitizeFilename(`search-results-${query}`) + '.csv';
      ExportUtils.triggerDownload(csvContent, safeFilename, 'text/csv;charset=utf-8');
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
      const safeFilename = ExportUtils.sanitizeFilename(`search-results-${query}`) + '.graphml';
      ExportUtils.triggerDownload(graphmlContent, safeFilename, 'application/xml;charset=utf-8');
    } catch (error) {
      console.error('导出搜索结果GraphML文件失败:', error);
      throw new Error('导出搜索结果GraphML文件失败');
    }
  }
}
