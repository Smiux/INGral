import { readdirSync, readFileSync } from 'fs';
import { join, extname } from 'path';

const extensions = ['.ts', '.tsx', '.js', '.jsx'];
const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

function countLines(dir) {
  let results = [];
  
  function traverse(dir) {
    const files = readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = join(dir, file.name);
      
      if (file.isDirectory()) {
        if (!excludeDirs.includes(file.name)) {
          traverse(fullPath);
        }
      } else if (extensions.includes(extname(file.name))) {
        const content = readFileSync(fullPath, 'utf8');
        const lines = content.split('\n').length;
        results.push({ filePath: fullPath, lines });
      }
    }
  }
  
  traverse(dir);
  return results;
}

const projectPath = 'e:\\project';
const linesCount = countLines(projectPath);

linesCount.sort((a, b) => b.lines - a.lines);

console.log('Top 10 files by line count:');
console.log('====================================');
linesCount.slice(0, 10).forEach((item, index) => {
  console.log(`${index + 1}. ${item.filePath} - ${item.lines} lines`);
});
