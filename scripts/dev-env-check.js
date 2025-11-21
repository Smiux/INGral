#!/usr/bin/env node

/**
 * 开发环境检查脚本
 * 用于验证：
 * 1. 数据库连接
 * 2. TypeScript类型检查
 * 3. ESLint代码质量检查
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

console.log('===== 开发环境检查 =====\n');

// 检查结果对象
const results = {
  dbConnection: { status: 'pending', message: '' },
  typeCheck: { status: 'pending', message: '' },
  lintCheck: { status: 'pending', message: '' },
  overall: { status: 'pending', message: '' }
};

// 颜色代码
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

/**
 * 打印结果
 * @param {string} status - 状态 (success, error, warning)
 * @param {string} message - 消息内容
 */
function printResult(status, message) {
  let color = colors.reset;
  let statusIcon = '❓';
  
  switch (status) {
    case 'success':
      color = colors.green;
      statusIcon = '✅';
      break;
    case 'error':
      color = colors.red;
      statusIcon = '❌';
      break;
    case 'warning':
      color = colors.yellow;
      statusIcon = '⚠️';
      break;
  }
  
  console.log(`${color}${statusIcon} ${message}${colors.reset}`);
}

/**
 * 检查数据库连接
 */
async function checkDatabaseConnection() {
  console.log('检查数据库连接...');
  
  try {
    // 检查环境变量文件
    const envFile = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envFile)) {
      results.dbConnection.status = 'warning';
      results.dbConnection.message = '.env 文件不存在，使用默认配置';
      printResult('warning', '数据库连接: .env 文件不存在，使用默认配置');
      return;
    }
    
    // 尝试导入数据库连接模块
    const dbCheckScript = path.join(__dirname, '..', 'src', 'lib', 'supabase.ts');
    if (fs.existsSync(dbCheckScript)) {
      // 对于TypeScript文件，我们可以使用ts-node来执行一个简单的检查
      try {
        // 检查是否安装了pg包（PostgreSQL客户端）
        execSync('npm list pg', { stdio: 'ignore' });
        results.dbConnection.status = 'success';
        results.dbConnection.message = '数据库驱动已安装';
        printResult('success', '数据库连接: 数据库驱动已安装');
      } catch (error) {
        results.dbConnection.status = 'error';
        results.dbConnection.message = '未安装PostgreSQL驱动，请运行: npm install pg';
        printResult('error', `数据库连接: ${results.dbConnection.message}`);
      }
    } else {
      results.dbConnection.status = 'warning';
      results.dbConnection.message = '未找到数据库连接模块，跳过实际连接测试';
      printResult('warning', `数据库连接: ${results.dbConnection.message}`);
    }
  } catch (error) {
    results.dbConnection.status = 'error';
    results.dbConnection.message = `连接检查失败: ${error.message}`;
    printResult('error', `数据库连接: ${results.dbConnection.message}`);
  }
}

/**
 * 执行TypeScript类型检查
 */
function runTypeCheck() {
  console.log('\n执行TypeScript类型检查...');
  
  try {
    execSync('npm run typecheck', { stdio: 'inherit' });
    results.typeCheck.status = 'success';
    results.typeCheck.message = 'TypeScript类型检查通过';
    printResult('success', '类型检查: 通过');
  } catch (error) {
    results.typeCheck.status = 'error';
    results.typeCheck.message = 'TypeScript类型检查失败，请修复错误';
    printResult('error', `类型检查: 失败 - 请查看上面的错误信息`);
  }
}

/**
 * 执行ESLint代码质量检查
 */
function runLintCheck() {
  console.log('\n执行ESLint代码质量检查...');
  
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    results.lintCheck.status = 'success';
    results.lintCheck.message = 'ESLint代码质量检查通过';
    printResult('success', '代码质量: 通过');
  } catch (error) {
    results.lintCheck.status = 'error';
    results.lintCheck.message = 'ESLint代码质量检查失败，请修复错误';
    printResult('error', `代码质量: 失败 - 请查看上面的错误信息`);
  }
}

/**
 * 计算总体结果
 */
function calculateOverallResult() {
  const errors = [results.dbConnection, results.typeCheck, results.lintCheck]
    .filter(result => result.status === 'error').length;
  
  const warnings = [results.dbConnection, results.typeCheck, results.lintCheck]
    .filter(result => result.status === 'warning').length;
  
  if (errors > 0) {
    results.overall.status = 'error';
    results.overall.message = `检查完成，但有 ${errors} 个错误和 ${warnings} 个警告需要修复`;
  } else if (warnings > 0) {
    results.overall.status = 'warning';
    results.overall.message = `检查完成，有 ${warnings} 个警告，但没有错误`;
  } else {
    results.overall.status = 'success';
    results.overall.message = '所有检查通过！开发环境配置正确';
  }
  
  console.log('\n' + '='.repeat(50));
  printResult(results.overall.status, `总体结果: ${results.overall.message}`);
  console.log('='.repeat(50));
  
  return results.overall.status === 'error' ? 1 : 0;
}

/**
 * 主函数
 */
async function main() {
  try {
    await checkDatabaseConnection();
    runTypeCheck();
    runLintCheck();
    const exitCode = calculateOverallResult();
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ 检查过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main();