import { Article } from '../types';
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
创建时间: ${new Date(article.created_at).toLocaleString()}
更新时间: ${new Date(article.updated_at).toLocaleString()}

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
      <p><strong>创建时间：</strong>${new Date(article.created_at).toLocaleString()}</p>
      <p><strong>更新时间：</strong>${new Date(article.updated_at).toLocaleString()}</p>
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
   * @param content 文件内容
   * @param filename 文件名
   * @param mimeType MIME类型
   */
  triggerDownload(content: string, filename: string, mimeType: string): void {
    try {
      // 创建Blob对象
      const blob = new Blob([content], { type: mimeType });
      
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
      .replace(/[<>:/\\|?*"]/g, '_') // 移除Windows文件名中的非法字符
      .replace(/\s+/g, ' ')           // 合并多个空格
      .trim()                         // 移除首尾空格
      .slice(0, 100);                 // 限制长度
  }
}

// 导出单例
export default new ExportService();
