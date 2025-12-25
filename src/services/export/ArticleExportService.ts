import type { Article } from '../../types';
import { renderMarkdown } from '../../utils/markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ExportUtils } from './ExportUtils';

/**
 * 文章导出服务类，提供文章导出功能
 */
export class ArticleExportService {
  /**
   * 使用jsPDF导出文章为PDF
   * @param article 文章对象
   */
  async exportArticleToPdfWithJsPdf (article: Article): Promise<void> {
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
      // 提高分辨率
        'scale': 2,
        'useCORS': true,
        'backgroundColor': '#ffffff',
        'logging': false
      });

      // 清理临时元素
      document.body.removeChild(tempElement);

      // 创建PDF
      const imgData = canvas.toDataURL('image/png');
      // jsPDF是一个特殊情况，虽然导入为小写，但实际上是构造函数
      // eslint-disable-next-line new-cap
      const pdf = new jsPDF({
        'orientation': 'portrait',
        'unit': 'mm',
        'format': 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      const position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);

      // 保存PDF
      const safeFilename = ExportUtils.sanitizeFilename(article.title) + '.pdf';
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
  async exportToLatex (article: Article): Promise<string> {
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
    \\textbf{作者ID:} & ${article.author_id || 'Unknown'} \\\\
    \\textbf{创建时间:} & ${article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'} \\\\
    \\textbf{更新时间:} & ${article.updated_at ? new Date(article.updated_at).toLocaleString() : 'N/A'}
\\end{tabular}

\\section*{内容}

${this.markdownToLatex(article.content)}

\

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
  private markdownToLatex (markdown: string): string {
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
      latex = latex.replace(/(\\item.*?)(?=\\item|$)/gs, '\\begin{itemize}$1\\end{itemize}');


      // 引用转换
      latex = latex.replace(/^>\s+(.*$)/gm, '\\begin{quote}$1\\end{quote}');

      // 表格转换（简单实现）
      latex = latex.replace(/\|(.*?)\|\n\|(.*?)\|\n((?:\|.*?\|\n)*)/g, (_, headers, _separator, rows) => {
        const headerCols = headers.split('|').map((col: string) => col.trim())
          .filter((col: string) => col);
        const dataRows = rows.split('\n')
          .filter((row: string) => row.trim())
          .map((row: string) => row.split('|').map((col: string) => col.trim())
            .filter((col: string) => col));

        let tableLatex = '\\begin{table}[h]\n\\centering\n\\begin{tabular}{';

        // 添加表格列格式
        tableLatex += '|c'.repeat(headerCols.length) + '|\\\\hline\n';

        // 添加表头
        tableLatex += headerCols.join('|') + '\\\\hline\n';

        // 添加数据行
        dataRows.forEach((row: string[]) => {
          tableLatex += row.join('|') + '\\\\hline\n';
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
  async exportArticleToLatex (article: Article): Promise<void> {
    try {
      const latexContent = await this.exportToLatex(article);
      const safeFilename = ExportUtils.sanitizeFilename(article.title) + '.tex';
      ExportUtils.triggerDownload(latexContent, safeFilename, 'application/x-latex;charset=utf-8');
    } catch (error) {
      console.error('导出LaTeX文件失败:', error);
      throw new Error('导出LaTeX文件失败');
    }
  }

  /**
   * 导出为Markdown格式
   * @param article 文章对象
   * @returns Markdown格式的文本
   */
  async exportToMarkdown (article: Article): Promise<string> {
    try {
      // 创建Markdown内容
      const markdownContent = `# ${article.title}

## 元信息
作者ID: ${article.author_id || 'Unknown'}
创建时间: ${article.created_at ? new Date(article.created_at).toLocaleString() : 'N/A'}
        更新时间: ${article.updated_at ? new Date(article.updated_at).toLocaleString() : 'N/A'}

## 内容
${article.content}


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
  async exportToHtml (article: Article): Promise<string> {
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
   * 导出文章为Markdown文件
   * @param article 文章对象
   */
  async exportArticleToMarkdown (article: Article): Promise<void> {
    try {
      const markdownContent = await this.exportToMarkdown(article);
      // 清理文件名，移除特殊字符
      const safeFilename = ExportUtils.sanitizeFilename(article.title) + '.md';
      ExportUtils.triggerDownload(markdownContent, safeFilename, 'text/markdown;charset=utf-8');
    } catch (error) {
      console.error('导出Markdown文件失败:', error);
      throw new Error('导出Markdown文件失败');
    }
  }

  /**
   * 导出文章为HTML文件
   * @param article 文章对象
   */
  async exportArticleToHtml (article: Article): Promise<void> {
    try {
      const htmlContent = await this.exportToHtml(article);
      // 清理文件名，移除特殊字符
      const safeFilename = ExportUtils.sanitizeFilename(article.title) + '.html';
      ExportUtils.triggerDownload(htmlContent, safeFilename, 'text/html;charset=utf-8');
    } catch (error) {
      console.error('导出HTML文件失败:', error);
      throw new Error('导出HTML文件失败');
    }
  }

  /**
   * 导出文章为PDF（使用浏览器打印功能）
   * @param article 文章对象
   */
  async exportArticleToPdf (article: Article): Promise<void> {
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
}
