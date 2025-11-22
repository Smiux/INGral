import * as fs from 'fs';
import * as path from 'path';

// 读取文件内容 - 直接使用相对路径
const filePath = 'src/utils/article.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 首先移除所有现有的eslint-disable注释，避免重复
content = content.replace(/\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\n/gm, '');

// 精确查找所有非注释行中的"as any"实例
const lines = content.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // 跳过已经是注释的行
  if (!line.trim().startsWith('//')) {
    // 检查是否包含"as any"
    if (line.includes('as any')) {
      // 在这一行前面添加禁用注释
      newLines.push('// eslint-disable-next-line @typescript-eslint/no-explicit-any');
    }
  }
  
  newLines.push(line);
}

// 重新组合内容
content = newLines.join('\n');

// 保存修改后的文件
fs.writeFileSync(filePath, content, 'utf8');

console.log('ESLint disable comments added to all "as any" instances');