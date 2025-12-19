import type { Article, Graph } from '../types';
import type { SemanticSearchResult } from './semanticSearchService';
import { BaseService } from './baseService';
import { ArticleExportService } from './export/ArticleExportService';
import { GraphExportService } from './export/GraphExportService';
import { SearchResultsExportService } from './export/SearchResultsExportService';
import { GraphImportService } from './export/GraphImportService';
import { ExportUtils } from './export/ExportUtils';

/**
 * 导出服务类，提供文章、知识图谱、搜索结果的导出和知识图谱导入功能
 */
export class ExportService extends BaseService {
  private static instance: ExportService;

  // 子服务实例
  private articleExportService: ArticleExportService;

  private graphExportService: GraphExportService;

  private searchResultsExportService: SearchResultsExportService;

  private graphImportService: GraphImportService;

  private constructor () {
    super();
    // 初始化子服务实例
    this.articleExportService = new ArticleExportService();
    this.graphExportService = new GraphExportService();
    this.searchResultsExportService = new SearchResultsExportService();
    this.graphImportService = new GraphImportService();
  }

  /**
   * 获取单例实例
   */
  static getInstance (): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  // ===========================
  // 文章导出方法（代理到 ArticleExportService）
  // ===========================

  /**
   * 使用jsPDF导出文章为PDF
   * @param article 文章对象
   */
  async exportArticleToPdfWithJsPdf (article: Article): Promise<void> {
    return this.articleExportService.exportArticleToPdfWithJsPdf(article);
  }

  /**
   * 导出为LaTeX格式
   * @param article 文章对象
   * @returns LaTeX格式的文本
   */
  async exportToLatex (article: Article): Promise<string> {
    return this.articleExportService.exportToLatex(article);
  }

  /**
   * 导出文章为LaTeX文件
   * @param article 文章对象
   */
  async exportArticleToLatex (article: Article): Promise<void> {
    return this.articleExportService.exportArticleToLatex(article);
  }

  /**
   * 导出为Markdown格式
   * @param article 文章对象
   * @returns Markdown格式的文本
   */
  async exportToMarkdown (article: Article): Promise<string> {
    return this.articleExportService.exportToMarkdown(article);
  }

  /**
   * 导出为HTML格式（为PDF导出做准备）
   * @param article 文章对象
   * @returns HTML格式的文本
   */
  async exportToHtml (article: Article): Promise<string> {
    return this.articleExportService.exportToHtml(article);
  }

  /**
   * 导出文章为Markdown文件
   * @param article 文章对象
   */
  async exportArticleToMarkdown (article: Article): Promise<void> {
    return this.articleExportService.exportArticleToMarkdown(article);
  }

  /**
   * 导出文章为HTML文件
   * @param article 文章对象
   */
  async exportArticleToHtml (article: Article): Promise<void> {
    return this.articleExportService.exportArticleToHtml(article);
  }

  /**
   * 导出文章为PDF（使用浏览器打印功能）
   * @param article 文章对象
   */
  async exportArticleToPdf (article: Article): Promise<void> {
    return this.articleExportService.exportArticleToPdf(article);
  }

  // ===========================
  // 知识图谱导出方法（代理到 GraphExportService）
  // ===========================

  /**
   * 导出知识图谱为JSON格式
   * @param graph 图谱数据
   * @returns JSON格式的图谱数据
   */
  async exportGraphToJson (graph: Graph): Promise<string> {
    return this.graphExportService.exportGraphToJson(graph);
  }

  /**
   * 导出知识图谱为GraphML格式
   * @param graph 图谱数据
   * @returns GraphML格式的图谱数据
   */
  async exportGraphToGraphml (graph: Graph): Promise<string> {
    return this.graphExportService.exportGraphToGraphml(graph);
  }

  /**
   * 导出知识图谱为CSV格式（节点和链接两个文件）
   * @param graph 图谱数据
   * @returns 包含节点和链接CSV数据的对象
   */
  async exportGraphToCsv (graph: Graph): Promise<{ nodesCsv: string; linksCsv: string }> {
    return this.graphExportService.exportGraphToCsv(graph);
  }

  /**
   * 导出图谱为JSON文件
   * @param graph 图谱数据
   */
  async exportGraphAsJsonFile (graph: Graph): Promise<void> {
    return this.graphExportService.exportGraphAsJsonFile(graph);
  }

  /**
   * 导出图谱为GraphML文件
   * @param graph 图谱数据
   */
  async exportGraphAsGraphmlFile (graph: Graph): Promise<void> {
    return this.graphExportService.exportGraphAsGraphmlFile(graph);
  }

  /**
   * 导出图谱为CSV文件（生成zip包）
   * @param graph 图谱数据
   */
  async exportGraphAsCsvFiles (graph: Graph): Promise<void> {
    return this.graphExportService.exportGraphAsCsvFiles(graph);
  }

  /**
   * 导出图谱为PNG图片
   * @param svgSelector 图谱SVG的选择器
   * @param filename 文件名
   */
  async exportGraphAsPng (svgSelector: string, filename: string): Promise<void> {
    return this.graphExportService.exportGraphAsPng(svgSelector, filename);
  }

  /**
   * 导出图谱为PDF
   * @param svgSelector 图谱SVG的选择器
   * @param graph 图谱数据
   */
  async exportGraphAsPdf (svgSelector: string, graph: Graph): Promise<void> {
    return this.graphExportService.exportGraphAsPdf(svgSelector, graph);
  }

  // ===========================
  // 搜索结果导出方法（代理到 SearchResultsExportService）
  // ===========================

  /**
   * 导出搜索结果为JSON格式
   * @param results 搜索结果数组
   * @param query 搜索查询
   * @returns JSON格式的搜索结果
   */
  async exportSearchResultsToJson (
    results: SemanticSearchResult[],
    query: string
  ): Promise<string> {
    return this.searchResultsExportService.exportSearchResultsToJson(results, query);
  }

  /**
   * 导出搜索结果为CSV格式
   * @param results 搜索结果数组
   * @returns CSV格式的搜索结果
   */
  async exportSearchResultsToCsv (
    results: SemanticSearchResult[]
  ): Promise<string> {
    return this.searchResultsExportService.exportSearchResultsToCsv(results);
  }

  /**
   * 导出搜索结果为GraphML格式
   * @param results 搜索结果数组
   * @returns GraphML格式的搜索结果
   */
  async exportSearchResultsToGraphml (
    results: SemanticSearchResult[]
  ): Promise<string> {
    return this.searchResultsExportService.exportSearchResultsToGraphml(results);
  }

  /**
   * 导出搜索结果为PDF
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsToPdf (
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    return this.searchResultsExportService.exportSearchResultsToPdf(results, query);
  }

  /**
   * 导出搜索结果为JSON文件
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsAsJsonFile (
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    return this.searchResultsExportService.exportSearchResultsAsJsonFile(results, query);
  }

  /**
   * 导出搜索结果为CSV文件
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsAsCsvFile (
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    return this.searchResultsExportService.exportSearchResultsAsCsvFile(results, query);
  }

  /**
   * 导出搜索结果为GraphML文件
   * @param results 搜索结果数组
   * @param query 搜索查询
   */
  async exportSearchResultsAsGraphmlFile (
    results: SemanticSearchResult[],
    query: string
  ): Promise<void> {
    return this.searchResultsExportService.exportSearchResultsAsGraphmlFile(results, query);
  }

  // ===========================
  // 知识图谱导入方法（代理到 GraphImportService）
  // ===========================

  /**
   * 导入知识图谱数据
   * @param file 文件对象
   * @returns 解析后的图谱数据
   */
  async importGraphFromFile (file: File): Promise<Graph> {
    return this.graphImportService.importGraphFromFile(file);
  }

  // ===========================
  // 公共工具方法（直接暴露 ExportUtils 的方法）
  // ===========================

  /**
   * 触发文件下载
   * @param content 文件内容（字符串或Blob）
   * @param filename 文件名
   * @param mimeType MIME类型
   */
  triggerDownload (content: string | Blob, filename: string, mimeType: string): void {
    return ExportUtils.triggerDownload(content, filename, mimeType);
  }

  /**
   * 清理文件名，移除特殊字符
   * @param filename 原始文件名
   * @returns 清理后的文件名
   */
  sanitizeFilename (filename: string): string {
    return ExportUtils.sanitizeFilename(filename);
  }
}

// 导出单例
export const exportService = ExportService.getInstance();
