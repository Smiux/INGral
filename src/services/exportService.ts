import type { Article } from '../types';
import { BaseService } from './baseService';
import { ArticleExportService } from './export/ArticleExportService';
import { ExportUtils } from './export/ExportUtils';

/**
 * 导出服务类，提供文章、知识图谱、搜索结果的导出和知识图谱导入功能
 */
export class ExportService extends BaseService {
  private static instance: ExportService;

  // 子服务实例
  private articleExportService: ArticleExportService;

  private constructor () {
    super();
    // 初始化子服务实例
    this.articleExportService = new ArticleExportService();
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
