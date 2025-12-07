import { promises as fs } from 'fs';
import path from 'path';

/**
 * 站点地图条目接口定义
 */
interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * 站点地图生成器类
 */
export class SitemapGenerator {
  private baseUrl: string;
  private routes: SitemapEntry[];

  /**
   * 构造函数
   * @param baseUrl 网站基础URL
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.routes = [];
  }

  /**
   * 添加路由到站点地图
   * @param route 路由信息
   */
  addRoute(route: Omit<SitemapEntry, 'url'> & { path: string }): void {
    const url = `${this.baseUrl}${route.path}`;
    const entry: SitemapEntry = {
      url,
    };

    // 确保只有在值存在时才添加
    if (route.lastModified !== undefined) {
      entry.lastModified = route.lastModified;
    }
    if (route.changeFrequency !== undefined) {
      entry.changeFrequency = route.changeFrequency;
    }
    if (route.priority !== undefined) {
      entry.priority = route.priority;
    }

    this.routes.push(entry);
  }

  /**
   * 生成XML格式的站点地图
   * @returns XML格式的站点地图字符串
   */
  generateXml(): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    const urlEntries = this.routes.map((route) => {
      let entry = `  <url>
    <loc>${route.url}</loc>`;

      // 明确检查lastModified是否存在且不为空字符串
      if (route.lastModified !== undefined && route.lastModified !== '') {
        entry += `
    <lastmod>${route.lastModified}</lastmod>`;
      }

      if (route.changeFrequency) {
        entry += `
    <changefreq>${route.changeFrequency}</changefreq>`;
      }

      if (route.priority !== undefined) {
        entry += `
    <priority>${route.priority}</priority>`;
      }

      entry += `
  </url>`;
      return entry;
    }).join('\n');

    const xmlFooter = `
</urlset>`;

    return xmlHeader + '\n' + urlEntries + xmlFooter;
  }

  /**
   * 保存站点地图到文件
   * @param outputPath 输出文件路径
   */
  async saveToFile(outputPath: string): Promise<void> {
    try {
      const xmlContent = this.generateXml();
      await fs.writeFile(outputPath, xmlContent, 'utf8');
      console.log(`站点地图已保存到: ${outputPath}`);
    } catch (error) {
      console.error('保存站点地图失败:', error);
      throw error;
    }
  }
}

/**
 * 获取应用的静态路由列表
 * @returns 路由配置数组
 */
function getStaticRoutes(): (Omit<SitemapEntry, 'url'> & { path: string })[] {
  // 从App.tsx中提取的静态路由
  return [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/articles', changeFrequency: 'daily', priority: 0.9 },
    { path: '/search', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/graph', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/database', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/notifications', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/dashboard', changeFrequency: 'weekly', priority: 0.8 },
    // 注意：动态路由如 /article/:slug 不包含在站点地图中
    // 实际应用中，应从数据库获取实际的文章和用户URL
  ];
}

/**
 * 生成站点地图的主函数
 * @param baseUrl 网站基础URL
 * @param outputPath 输出文件路径
 */
export async function generateSitemap(
  baseUrl = 'http://localhost:3000',
  outputPath: string = path.resolve(process.cwd(), 'dist', 'sitemap.xml'),
): Promise<void> {
  const generator = new SitemapGenerator(baseUrl);
  const staticRoutes = getStaticRoutes();

  // 添加静态路由
  staticRoutes.forEach(route => {
    generator.addRoute(route);
  });

  // 生成并保存站点地图
  await generator.saveToFile(outputPath);
}

/**
 * 生成站点地图XML字符串
 * @param baseUrl 网站基础URL
 * @returns XML格式的站点地图字符串
 */
export function getSitemapXml(baseUrl = 'http://localhost:3000'): string {
  const generator = new SitemapGenerator(baseUrl);
  const staticRoutes = getStaticRoutes();

  // 添加静态路由
  staticRoutes.forEach(route => {
    generator.addRoute(route);
  });

  return generator.generateXml();
}
