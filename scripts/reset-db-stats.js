#!/usr/bin/env node

/**
 * 重置数据库统计信息脚本
 * 用途：清除旧查询的统计记录，只保留新查询的统计信息
 */

// import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// 加载.env和.env.local文件中的环境变量
dotenv.config();
try {
  const envLocalPath = join(process.cwd(), '.env.local');
  if (existsSync(envLocalPath)) {
    const envConfig = dotenv.parse(readFileSync(envLocalPath, 'utf8'));
    for (const key in envConfig) {
      if (Object.prototype.hasOwnProperty.call(envConfig, key)) {
        process.env[key] = envConfig[key];
      }
    }
  }
} catch (error) {
  console.error('加载.env.local文件失败:', error.message);
}

// 获取Supabase配置，使用VITE_前缀的环境变量
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
// const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 验证必要的环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('错误: 未设置必要的环境变量，请确保VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY已配置');
  process.exit(1);
}

// 创建Supabase客户端 - 注释掉未使用的客户端
// 使用service role key如果可用，否则使用anon key
// const supabase = createClient(
//   SUPABASE_URL, 
//   SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
// );

/**
 * 直接执行SQL命令（通过PostgreSQL客户端）- 注释掉未使用的函数
 */
// async function executeSqlDirect(sql) {
//   try {
//     // 由于execute_sql函数可能不存在，我们直接使用Supabase的rpc调用或其他方式
//     // 这里我们改为使用getPostgreSQLSystemInfo函数的模式
//     const result = await getPostgreSQLSystemInfo(sql);
//     return result;
//   } catch (err) {
//     console.error('❌ SQL执行失败:', err.message);
//     throw err;
//   }
// }

// 从迁移文件中提取表名的改进方法 - 注释掉未使用的函数
// function extractTablesFromMigrations() {
//   const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
//   const tables = new Set();

//   if (existsSync(migrationsDir)) {
//     const migrationFiles = readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
//     
//     for (const file of migrationFiles) {
//       const content = readFileSync(join(migrationsDir, file), 'utf8');
//       
//       // 改进的表名提取逻辑，处理不同的CREATE TABLE语法
//       const tableMatches = content.match(/CREATE\s+(?:TABLE|TABLE IF NOT EXISTS)\s+[^(]+\s+(\w+)/gi);
//       if (tableMatches) {
//         tableMatches.forEach(match => {
//           const parts = match.split(/\s+/).filter(Boolean);
//           let tableName;
//           
//           const tableIndex = parts.indexOf('TABLE') + 1;
//           if (parts[tableIndex] === 'IF' && parts[tableIndex + 1] === 'NOT' && parts[tableIndex + 2] === 'EXISTS') {
//             tableName = parts[tableIndex + 3];
//           } else {
//             tableName = parts[tableIndex];
//           }
//           
//           if (tableName.includes('.')) {
//             tableName = tableName.split('.')[1];
//           }
//           
//           tableName = tableName.replace(/["']/g, '');
//           
//           if (tableName) tables.add(tableName);
//         });
//       }
//     }
//   }

//   return Array.from(tables);
// }

// 获取PostgreSQL系统信息 - 注释掉未使用的函数
// async function getPostgreSQLSystemInfo(customSql = null) {
//   let tables = [];
//   const functions = [];
//   const triggers = [];
//   const indexes = [];
//   
//   try {
//     // 方法1：从迁移文件中提取表名
//     const migrationTables = extractTablesFromMigrations();
//     tables = migrationTables;
//     
//     // 如果提供了自定义SQL，尝试执行
//     if (customSql) {
//       // 这里我们不使用execute_sql函数，而是返回一个模拟结果
//       // 因为我们无法直接在客户端执行任意SQL
//       console.log(`   执行SQL: ${customSql.substring(0, 50)}...`);
//       return { result: [] };
//     }
//     
//   } catch (err) {
//     console.error('获取PostgreSQL系统信息时发生错误:', err.message);
//   }
//   
//   return { tables, functions, triggers, indexes };
// }

/**
 * 重置数据库统计信息
 */
async function resetDatabaseStats() {
  console.log('🔄 开始重置数据库统计信息...');
  
  try {
    // 由于我们无法直接从客户端执行这些SQL命令，我们将提供一个手动执行指南
    console.log('\n📋 数据库统计信息重置指南:');
    console.log('   请在PostgreSQL数据库直接执行以下SQL命令:');
    console.log('   ');
    console.log('   1. 重置表统计信息:');
    console.log('      ANALYZE VERBOSE;');
    console.log('   ');
    console.log('   2. 重置查询统计信息:');
    console.log('      SELECT pg_stat_statements_reset();');
    console.log('   ');
    console.log('   3. 重置连接统计信息:');
    console.log('      SELECT pg_stat_reset_single_table_counters(\'pg_catalog.pg_stat_activity\'::regclass);');
    console.log('   ');
    console.log('   4. 重置用户表统计信息:');
    console.log('      SELECT pg_stat_reset();');
    console.log('   ');
    console.log('   5. 验证重置效果:');
    console.log('      SELECT query, calls, total_time FROM pg_stat_statements ORDER BY calls DESC LIMIT 10;');
    console.log('   ');
    
    // 创建一个SQL文件，包含所有需要执行的命令
    const sqlCommands = `-- 数据库统计信息重置脚本
-- 用途：清除旧查询的统计记录，只保留新查询的统计信息

-- 1. 重置表统计信息
ANALYZE VERBOSE;

-- 2. 重置查询统计信息
SELECT pg_stat_statements_reset();

-- 3. 重置连接统计信息
SELECT pg_stat_reset_single_table_counters('pg_catalog.pg_stat_activity'::regclass);

-- 4. 重置用户表统计信息
SELECT pg_stat_reset();

-- 5. 验证重置效果
SELECT query, calls, total_time FROM pg_stat_statements ORDER BY calls DESC LIMIT 10;
`;
    
    // 将SQL命令写入文件
    const fs = await import('fs');
    fs.writeFileSync('reset-stats.sql', sqlCommands);
    
    console.log('🎉 数据库统计信息重置脚本已生成！');
    console.log('   文件名: reset-stats.sql');
    console.log('   ');
    console.log('   请使用以下方法之一执行:');
    console.log('   - 使用psql命令: psql -h localhost -U postgres -d example_db -f reset-stats.sql');
    console.log('   - 使用pgAdmin或其他PostgreSQL客户端导入并执行该文件');
    console.log('   - 直接复制上述SQL命令到数据库查询工具中执行');
    console.log('   ');
    console.log('   执行后，旧查询的统计记录将被清除，只保留新查询的统计信息。');
    
  } catch (err) {
    console.error('\n❌ 生成重置脚本失败:', err.message);
    process.exit(1);
  }
}

/**
 * 显示当前统计信息（用于验证）
 */
async function showCurrentStats() {
  console.log('\n📊 显示当前查询统计信息（前10条）...');
  console.log('   请在数据库中执行以下命令查看:');
  console.log('   SELECT query, calls, total_time, mean_time, rows FROM pg_stat_statements ORDER BY calls DESC LIMIT 10;');
  console.log('   ');
  console.log('   预期结果:');
  console.log('   - 刚重置后，应该没有或只有很少的查询记录');
  console.log('   - 只有新执行的查询会被记录');
  console.log('   ');
  console.log('   注意: 确保已安装pg_stat_statements扩展');
  console.log('   如果未安装，请执行: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;');
}

/**
 * 主函数
 */
async function main() {
  console.log('========= 数据库统计信息重置工具 =========\n');
  
  try {
    // 验证环境变量
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌ 错误: 缺少必要的环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY');
      console.error('   请确保已创建 .env 文件并配置了正确的环境变量');
      process.exit(1);
    }
    
    // 重置统计信息
    await resetDatabaseStats();
    
    // 显示当前统计信息（验证重置效果）
    await showCurrentStats();
    
    console.log('\n========= 操作完成 =========');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ 程序执行出错:', err.message);
    process.exit(1);
  }
}

// 执行主函数
main();
