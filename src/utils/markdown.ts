/**
 * Markdown 处理工具
 * 
 * 功能特性：
 * - Markdown 转 HTML 渲染
 * - Wiki 链接支持（[[Title|Display Text]]）
 * - 数学公式（KaTeX）支持（$inline$ 和 $$block$$）
 * - 标题转 Slug 功能
 * - Wiki 链接提取功能
 */
import MarkdownIt from 'markdown-it';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * MarkdownIt 实例配置
 */
const md = new MarkdownIt({
  html: true,           // 允许 HTML 标签
  linkify: true,        // 自动识别链接
  typographer: true,    // 启用排版优化
});

/**
 * 自定义文本渲染规则
 * 处理 Wiki 链接和数学公式
 */
md.renderer.rules.text = function(tokens: Array<{ content?: string }>, idx: number) {
  const token = tokens[idx];
  // 类型安全检查，确保token和content存在
  const text = token?.content || '';

  let result = text;

  // 处理 Wiki 链接：[[Title|Display Text]] 格式
  result = result.replace(/\[\[([^\]]+)\]\]/g, (_match: string, p1: string) => {
    const parts = p1.split('|').map((s: string) => s.trim());
    const title = parts[0] || '';
    const displayText = parts[1] || title;
    const slug = titleToSlug(title || displayText);
    return `<a href="/article/${slug}" class="wiki-link">${displayText}</a>`;
  });

  // 处理块级数学公式：$$...$$ 格式
  result = result.replace(/\$\$([^$]+)\$\$/g, (_match: string, p1: string) => {
    try {
      const html = katex.renderToString(p1, { displayMode: true });
      return html;
    } catch {
      return _match; // 渲染失败时返回原始内容
    }
  });

  // 处理内联数学公式：$...$ 格式
  result = result.replace(/\$([^$]+)\$/g, (_match: string, p1: string) => {
    try {
      const html = katex.renderToString(p1, { displayMode: false });
      return html;
    } catch {
      return _match; // 渲染失败时返回原始内容
    }
  });

  return result;
};

/**
 * 将 Markdown 文本渲染为 HTML
 * @param content Markdown 文本
 * @returns 渲染后的 HTML 字符串
 */
export function renderMarkdown(content: string): string {
  return md.render(content);
}

/**
 * 将标题转换为 Slug（用于 URL 和锚点）
 * @param title 标题文本
 * @returns Slug 字符串
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')       // 移除特殊字符
    .replace(/[\s_]+/g, '-')        // 替换空格和下划线为连字符
    .replace(/^-+|-+$/g, '');        // 移除首尾连字符
}

/**
 * 从 Markdown 内容中提取所有 Wiki 链接
 * @param content Markdown 文本
 * @returns Wiki 链接标题数组
 */
export function extractWikiLinks(content: string): string[] {
  const matches: string[] = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map((match: string) => {
    const parts = match.slice(2, -2).split('|');
    const title = parts[0]?.trim() || '';
    return title;
  });
}
