import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'src/services/analyticsService.ts');
const content = fs.readFileSync(filePath, 'utf8', { encoding: 'utf8' });

const importedTypes = [
  'PageView',
  'ArticleInteraction', 
  'AnalyticsMetric',
  'AnalyticsQueryParams',
  'ChartData',
  'StatCard',
  'PopularContent',
  'TrafficSource',
  'UserEngagement',
  'ContentStats',
  'TimeSeriesData'
];

const unusedTypes = [];

importedTypes.forEach(type => {
  // 搜索类型使用，但排除import语句中的使用
  const importPattern = new RegExp(`import[^;]*\\b${type}\\b[^;]*;`, 'g');
  const contentWithoutImport = content.replace(importPattern, '');
  const usagePattern = new RegExp(`\\b${type}\\b`, 'g');
  
  if (!usagePattern.test(contentWithoutImport)) {
    unusedTypes.push(type);
  }
});

console.log('未使用的导入类型:', unusedTypes);
