#!/usr/bin/env node

/**
 * 站点地图生成脚本
 * 在构建过程中自动生成站点地图XML文件
 */

import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取项目根目录
const projectRoot = path.resolve(__dirname, '..');

// 动态导入站点地图生成器
async function main() {
  try {
    console.log('正在生成站点地图...');
    
    // 从构建环境变量获取基础URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // 设置输出路径为dist目录
    const outputPath = path.resolve(projectRoot, 'dist', 'sitemap.xml');
    
    // 在Windows环境下正确处理导入路径
    const sitemapPath = path.resolve(projectRoot, 'src', 'utils', 'sitemapGenerator.ts');
    // 使用file://协议处理ESM导入
    const { generateSitemap } = await import(`file://${sitemapPath.replace(/\\/g, '/')}`);
    
    // 生成站点地图
    await generateSitemap(baseUrl, outputPath);
    
    console.log('站点地图生成成功！');
  } catch (error) {
    console.error('生成站点地图失败:', error);
    process.exit(1);
  }
}

main();
