import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { join, extname } from 'path';

// 配置 - 使用当前工作目录
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.java', '.py', '.css', '.scss', '.json'];
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.vscode', '.idea'];
const EXCLUDE_FILES = ['.gitignore', '.gitattributes', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

// 执行Git命令获取已跟踪的文件列表
function getTrackedFiles() {
  try {
    console.log('正在获取Git跟踪文件...');
    // 使用cwd参数指定当前工作目录
    const result = execSync('git ls-files', { 
      encoding: 'utf8',
      windowsHide: true
    });
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.warn('无法获取Git跟踪文件:', error.message);
    console.warn('将跳过已提交文件的统计，仅统计所有文件...');
    return [];
  }
}

// 获取所有文件列表（递归）
function getAllFiles(dir = process.cwd()) {
  let files = [];
  
  function traverse(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (SOURCE_EXTENSIONS.includes(extname(entry.name)) && !EXCLUDE_FILES.includes(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// 统计文件的有效代码行数（排除空行和注释行）
function countValidLines(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let validLines = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 排除空行
    if (trimmedLine === '') continue;
    
    // 排除单行注释
    if (trimmedLine.startsWith('//') || 
        trimmedLine.startsWith('#') || 
        trimmedLine.startsWith('/*') || 
        trimmedLine.startsWith('*/')) continue;
    
    validLines++;
  }
  
  return validLines;
}

// 按文件类型分组统计
function groupByType(files, lineCounts) {
  const result = {};
  
  for (const file of files) {
    const ext = extname(file);
    const lines = lineCounts[file] || 0;
    
    if (!result[ext]) {
      result[ext] = { count: 0, lines: 0 };
    }
    
    result[ext].count++;
    result[ext].lines += lines;
  }
  
  return result;
}

// 生成统计报告
function generateReport(trackedFiles, allFiles, trackedLineCounts, allLineCounts) {
  // 获取当前工作目录名称
  const currentDir = process.cwd().split('\\').pop() || '项目';
  
  // 已提交文件统计
  const trackedTotalLines = Object.values(trackedLineCounts).reduce((sum, lines) => sum + lines, 0);
  const trackedFileCount = trackedFiles.length;
  const trackedAvgLines = trackedFileCount > 0 ? (trackedTotalLines / trackedFileCount).toFixed(2) : 0;
  const trackedByType = groupByType(trackedFiles, trackedLineCounts);
  
  // 所有文件统计
  const allTotalLines = Object.values(allLineCounts).reduce((sum, lines) => sum + lines, 0);
  const allFileCount = allFiles.length;
  const allAvgLines = allFileCount > 0 ? (allTotalLines / allFileCount).toFixed(2) : 0;
  const allByType = groupByType(allFiles, allLineCounts);
  
  // 打印报告
  console.log('='.repeat(60));
  console.log(`             ${currentDir} 代码行数统计分析报告`);
  console.log('='.repeat(60));
  console.log('');
  
  // 已提交文件统计 - 只有在Git可用时显示
  if (trackedFileCount > 0) {
    console.log('1. 已提交至版本控制系统的文件统计');
    console.log('-'.repeat(60));
    console.log(`文件总数: ${trackedFileCount}`);
    console.log(`代码总行数: ${trackedTotalLines}`);
    console.log(`平均文件代码行数: ${trackedAvgLines}`);
    console.log('');
    
    console.log('按文件类型统计:');
    console.log('类型  | 文件数 | 代码行数 | 平均每行/文件');
    console.log('----- | ------ | -------- | ------------');
    Object.entries(trackedByType)
      .sort(([, a], [, b]) => b.lines - a.lines)
      .forEach(([ext, { count, lines }]) => {
        const avg = (lines / count).toFixed(2);
        console.log(`${ext.padEnd(5)} | ${count.toString().padEnd(6)} | ${lines.toString().padEnd(8)} | ${avg}`);
      });
    console.log('');
  }
  
  // 所有文件统计
  console.log('2. 整个项目（包括已提交和未提交文件）统计');
  console.log('-'.repeat(60));
  console.log(`文件总数: ${allFileCount}`);
  console.log(`代码总行数: ${allTotalLines}`);
  console.log(`平均文件代码行数: ${allAvgLines}`);
  console.log('');
  
  console.log('按文件类型统计:');
  console.log('类型  | 文件数 | 代码行数 | 平均每行/文件');
  console.log('----- | ------ | -------- | ------------');
  Object.entries(allByType)
    .sort(([, a], [, b]) => b.lines - a.lines)
    .forEach(([ext, { count, lines }]) => {
      const avg = (lines / count).toFixed(2);
      console.log(`${ext.padEnd(5)} | ${count.toString().padEnd(6)} | ${lines.toString().padEnd(8)} | ${avg}`);
    });
  console.log('');
  
  // 差异统计 - 只有在Git可用时显示
  if (trackedFileCount > 0) {
    console.log('3. 差异统计');
    console.log('-'.repeat(60));
    console.log(`未提交文件数: ${allFileCount - trackedFileCount}`);
    console.log(`未提交文件代码行数: ${allTotalLines - trackedTotalLines}`);
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('统计完成！');
  console.log('说明：');
  console.log(' - 统计的是有效代码行数，排除了空行和注释行');
  console.log(' - 包含的文件类型：', SOURCE_EXTENSIONS.join(', '));
  console.log(' - 排除的目录：', EXCLUDE_DIRS.join(', '));
  console.log(' - 排除的文件：', EXCLUDE_FILES.join(', '));
  console.log('='.repeat(60));
}

// 主函数
async function main() {
  try {
    console.log('正在统计代码行数...');
    
    // 获取当前工作目录
    const currentDir = process.cwd();
    console.log(`统计目录: ${currentDir}`);
    
    // 获取文件列表
    const trackedFiles = getTrackedFiles();
    const allFiles = getAllFiles();
    
    // 将跟踪的文件名转换为完整路径
    const trackedFullPaths = trackedFiles
      .map(file => join(currentDir, file))
      // 过滤掉排除的文件，实现方案二：在已提交文件统计前过滤掉EXCLUDE_FILES中列出的文件
      .filter(file => {
        const fileName = file.split('\\').pop();
        return !EXCLUDE_FILES.includes(fileName);
      });
    
    // 统计已提交文件的代码行数（仅当Git可用时）
    const trackedLineCounts = {};
    if (trackedFullPaths.length > 0) {
      console.log('正在统计已提交文件代码行数...');
      trackedFullPaths.forEach(file => {
        try {
          trackedLineCounts[file] = countValidLines(file);
        }
        catch (error) {
          console.warn(`无法统计文件 ${file}:`, error.message);
        }
      });
    }
    
    // 统计所有文件的代码行数
    console.log('正在统计所有文件代码行数...');
    const allLineCounts = {};
    allFiles.forEach(file => {
      try {
        allLineCounts[file] = countValidLines(file);
      } catch (error) {
        console.warn(`无法统计文件 ${file}:`, error.message);
      }
    });
    
    // 生成报告
    generateReport(trackedFullPaths, allFiles, trackedLineCounts, allLineCounts);
    
  } catch (error) {
    console.error('统计过程中出错:', error.message);
    process.exit(1);
  }
}

// 执行主函数
main();
