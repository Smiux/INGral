#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync } from 'fs';
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 验证必要的环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('错误: 未设置必要的环境变量，请确保VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY已配置');
  process.exit(1);
}

// 创建Supabase客户端
// 使用service role key如果可用，否则使用anon key
const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
);

// 从迁移文件中提取表名的改进方法
function extractTablesFromMigrations() {
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const tables = new Set();

  if (existsSync(migrationsDir)) {
    const migrationFiles = readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
    
    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationsDir, file), 'utf8');
      
      // 改进的表名提取逻辑，处理不同的CREATE TABLE语法
      // 匹配标准CREATE TABLE语法
      const tableMatches = content.match(/CREATE\s+(?:TABLE|TABLE IF NOT EXISTS)\s+[^(]+\s+(\w+)/gi);
      if (tableMatches) {
        tableMatches.forEach(match => {
          // 提取表名，处理可能的schema前缀
          const parts = match.split(/\s+/).filter(Boolean);
          let tableName;
          
          // 查找表名位置
          const tableIndex = parts.indexOf('TABLE') + 1;
          if (parts[tableIndex] === 'IF' && parts[tableIndex + 1] === 'NOT' && parts[tableIndex + 2] === 'EXISTS') {
            tableName = parts[tableIndex + 3];
          } else {
            tableName = parts[tableIndex];
          }
          
          // 移除可能的schema前缀
          if (tableName.includes('.')) {
            tableName = tableName.split('.')[1];
          }
          
          // 移除可能的引号
          tableName = tableName.replace(/["']/g, '');
          
          if (tableName) tables.add(tableName);
        });
      }
    }
  }

  return Array.from(tables);
}

// 获取PostgreSQL系统信息（表、函数、触发器、索引等）
async function getPostgreSQLSystemInfo() {
  console.log('📋 获取PostgreSQL系统信息...');
  
  let tables = [];
  let functions = [];
  let triggers = [];
  let indexes = [];
  
  try {
    // 方法1：从迁移文件中提取表名（最可靠的方法）
    const migrationTables = extractTablesFromMigrations();
    
    // 方法2：使用更全面的已知表名列表进行检测
    // 基于项目结构和常见表名，扩展检测列表
    const EXTENDED_TABLES = [
      // 核心业务表
      'articles', 'users', 'comments', 'tags', 'article_tags', 
      'version_history', 'user_profiles',
      // 认证相关表
      'auth', 'auth_users', 'auth_sessions', 'auth_identities',
      // 存储相关表
      'storage', 'storage_buckets', 'storage_objects',
      // API相关表
      'swagger', 'info', 'host', 'path',
      // 其他可能的表
      'analytics', 'settings', 'notifications', 'logs',
      // 系统表（尝试）
      'migrations', 'extensions', 'graphql'
    ];
    
    const detectedTables = [];
    
    // 首先尝试迁移文件中的表名
    for (const tableName of migrationTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(1);
        if (!error) {
          detectedTables.push(tableName);
        }
      } catch {
        continue;
      }
    }
    
    // 然后尝试扩展表名列表
    for (const tableName of EXTENDED_TABLES) {
      try {
        if (!detectedTables.includes(tableName)) {
          const { error } = await supabase.from(tableName).select('*').limit(1);
          if (!error) {
            detectedTables.push(tableName);
          }
        }
      } catch {
        continue;
      }
    }
    
    // 合并结果，去重
    tables = [...new Set([...detectedTables, ...migrationTables])].sort();
    
  } catch (err) {
    console.error('⚠️  获取表列表时出错:', err.message);
    
    // 最终备用方案：仅从迁移文件提取
    tables = extractTablesFromMigrations();
  }
  
  // 尝试获取函数
  try {
    const { data: funcData } = await supabase.rpc('execute_sql', { sql: 'SELECT proname, proargtypes, prosrc FROM pg_proc WHERE schemaname = \'public\'' });
    if (funcData && funcData.result) {
      functions = funcData.result.map(row => ({
        name: row.proname,
        args: row.proargtypes,
        source: row.prosrc
      }));
    }
  } catch {
    // 忽略错误
  }
  
  // 尝试获取触发器
  try {
    const { data: triggerData } = await supabase.rpc('execute_sql', { sql: 'SELECT trigger_name, event_object_table, action_statement FROM information_schema.triggers WHERE trigger_schema = \'public\'' });
    if (triggerData && triggerData.result) {
      triggers = triggerData.result.map(row => ({
        name: row.trigger_name,
        table: row.event_object_table,
        action: row.action_statement
      }));
    }
  } catch {
    // 忽略错误
  }
  
  // 尝试获取索引
  try {
    const { data: indexData } = await supabase.rpc('execute_sql', { sql: 'SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = \'public\'' });
    if (indexData && indexData.result) {
      indexes = indexData.result.map(row => ({
        name: row.indexname,
        table: row.tablename,
        definition: row.indexdef
      }));
    }
  } catch {
    // 忽略错误
  }
  
  return { tables, functions, triggers, indexes };
}



// 列出所有表
async function listTables() {
  console.log('📋 获取表列表...');
  
  // 使用PostgreSQL系统表查询获取完整的表列表
  const { tables } = await getPostgreSQLSystemInfo();
  
  if (tables.length === 0) {
    console.log('❌ 无法获取表列表');
    return;
  }
  
  console.log('✅ 找到以下表:');
  tables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`);
  });
  
  console.log(`\n📊 总计: ${tables.length} 个表`);
  
  return tables;
}

// 列出所有函数
async function listFunctions() {
  console.log('📋 获取函数列表...');
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT proname, proargtypes, prosrc FROM pg_proc WHERE schemaname = \'public\'' });
    
    if (error) {
      console.error('❌ 无法获取函数列表:', error.message);
      return;
    }
    
    if (!data || !data.result || data.result.length === 0) {
      console.log('⚠️  没有找到公共函数');
      return;
    }
    
    console.log('✅ 找到以下函数:');
    data.result.forEach((func, index) => {
      console.log(`   ${index + 1}. ${func.proname} - 参数类型: ${func.proargtypes || '无'}`);
    });
    
    console.log(`\n📊 总计: ${data.result.length} 个函数`);
    
  } catch (err) {
    console.error('❌ 获取函数列表时发生错误:', err.message);
  }
}

// 列出所有触发器
async function listTriggers() {
  console.log('📋 获取触发器列表...');
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT trigger_name, event_object_table, action_statement FROM information_schema.triggers WHERE trigger_schema = \'public\'' });
    
    if (error) {
      console.error('❌ 无法获取触发器列表:', error.message);
      return;
    }
    
    if (!data || !data.result || data.result.length === 0) {
      console.log('⚠️  没有找到公共触发器');
      return;
    }
    
    console.log('✅ 找到以下触发器:');
    data.result.forEach((trigger, index) => {
      console.log(`   ${index + 1}. ${trigger.trigger_name} - 表: ${trigger.event_object_table}`);
    });
    
    console.log(`\n📊 总计: ${data.result.length} 个触发器`);
    
  } catch (err) {
    console.error('❌ 获取触发器列表时发生错误:', err.message);
  }
}

// 列出所有索引
async function listIndexes() {
  console.log('📋 获取索引列表...');
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT indexname, tablename, indexdef FROM pg_indexes WHERE schemaname = \'public\'' });
    
    if (error) {
      console.error('❌ 无法获取索引列表:', error.message);
      return;
    }
    
    if (!data || !data.result || data.result.length === 0) {
      console.log('⚠️  没有找到公共索引');
      return;
    }
    
    console.log('✅ 找到以下索引:');
    data.result.forEach((index, indexNum) => {
      console.log(`   ${indexNum + 1}. ${index.indexname} - 表: ${index.tablename}`);
    });
    
    console.log(`\n📊 总计: ${data.result.length} 个索引`);
    
  } catch (err) {
    console.error('❌ 获取索引列表时发生错误:', err.message);
  }
}

// 列出所有数据库对象（表、函数、触发器、索引）
async function listAllObjects() {
  console.log('📋 获取所有数据库对象...');
  
  const { tables, functions, triggers, indexes } = await getPostgreSQLSystemInfo();
  
  console.log('\n🏛️  数据库对象概览:');
  console.log(`   📋 表: ${tables.length} 个`);
  console.log(`   ⚙️  函数: ${functions.length} 个`);
  console.log(`   🔄 触发器: ${triggers.length} 个`);
  console.log(`   🔍 索引: ${indexes.length} 个`);
  
  if (tables.length > 0) {
    console.log('\n📋 表列表:');
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });
  }
  
  if (functions.length > 0) {
    console.log('\n⚙️  函数列表:');
    functions.forEach((func, index) => {
      console.log(`   ${index + 1}. ${func.name}`);
    });
  }
  
  if (triggers.length > 0) {
    console.log('\n🔄 触发器列表:');
    triggers.forEach((trigger, index) => {
      console.log(`   ${index + 1}. ${trigger.name}`);
    });
  }
  
  if (indexes.length > 0) {
    console.log('\n🔍 索引列表:');
    indexes.forEach((indexItem, indexNum) => {
      console.log(`   ${indexNum + 1}. ${indexItem.name}`);
    });
  }
}

// 描述表结构
async function describeTable(tableName) {
  console.log(`📋 描述表 "${tableName}" 的结构...`);
  
  try {
    // 尝试获取表数据来推断字段类型
    const { data, error } = await supabase.from(tableName).select('*').limit(5);
    
    if (error) {
      console.error('❌ 无法获取表数据:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  表中没有数据，无法推断字段类型');
      return;
    }
    
    // 从数据中推断字段类型
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow);
    
    console.log(`✅ 表 "${tableName}" 的结构:`);
    console.log('   +----------------+---------------+');
    console.log('   | 字段名          | 字段类型       |');
    console.log('   +----------------+---------------+');
    
    columns.forEach(column => {
      const value = sampleRow[column];
      let type = typeof value;
      
      // 更精确的类型判断
      if (type === 'object') {
        if (value === null) type = 'null';
        else if (Array.isArray(value)) type = 'array';
        else if (value instanceof Date) type = 'date';
        else type = 'json';
      }
      
      console.log(`   | ${column.padEnd(14)} | ${type.padEnd(13)} |`);
    });
    
    console.log('   +----------------+---------------+');
    console.log(`   共 ${columns.length} 个字段`);
    
    // 显示前几行数据作为示例
    console.log('\n📊 示例数据 (前3行):');
    data.slice(0, 3).forEach((row, index) => {
      console.log(`   行 ${index + 1}: ${JSON.stringify(row, null, 2)}`);
    });
    
  } catch (err) {
    console.error('❌ 描述表结构时发生错误:', err.message);
  }
}

// 查看表数据
async function viewTableData(tableName, limit = 10) {
  console.log(`📊 查看表 "${tableName}" 的数据 (前 ${limit} 行)...`);
  
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(limit);
    
    if (error) {
      console.error('❌ 无法获取表数据:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  表中没有数据');
      return;
    }
    
    console.log(`✅ 表 "${tableName}" 的数据:`);
    console.log(JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error('❌ 查看表数据时发生错误:', err.message);
  }
}

// 查看迁移文件
async function listMigrations() {
  console.log('📋 列出迁移文件...');
  
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  
  if (!existsSync(migrationsDir)) {
    console.log('❌ 迁移文件目录不存在');
    return;
  }
  
  try {
    const migrationFiles = readdirSync(migrationsDir).filter(file => file.endsWith('.sql'));
    
    if (migrationFiles.length === 0) {
      console.log('⚠️  没有找到迁移文件');
      return;
    }
    
    console.log('✅ 找到以下迁移文件:');
    migrationFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
  } catch (err) {
    console.error('❌ 读取迁移文件时发生错误:', err.message);
  }
}

// 运行迁移
async function runMigrations() {
  console.log('🚀 运行迁移...');
  console.log('⚠️  迁移功能暂时不可用，请使用Supabase CLI运行迁移:');
  console.log('   npx supabase migration up');
}

// 显示帮助信息
function showHelp() {
  console.log('📋 数据库调试工具命令:');
  console.log('   npm run db:list           - 列出所有表');
  console.log('   npm run db:describe <表名> - 描述表结构');
  console.log('   npm run db:view <表名>     - 查看表数据');
  console.log('   npm run db:migrations      - 列出迁移文件');
  console.log('   npm run db:migrate         - 运行迁移');
  console.log('   npm run db:functions       - 列出所有函数');
  console.log('   npm run db:triggers        - 列出所有触发器');
  console.log('   npm run db:indexes         - 列出所有索引');
  console.log('   npm run db:all             - 列出所有数据库对象');
  console.log('   npm run db:help            - 显示帮助信息');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list-tables':
      await listTables();
      break;
      
    case 'describe':
      if (!args[1]) {
        console.error('❌ 请指定表名');
        process.exit(1);
      }
      await describeTable(args[1]);
      break;
      
    case 'view-data':
    case 'view':
      if (!args[1]) {
        console.error('❌ 请指定表名');
        process.exit(1);
      }
      await viewTableData(args[1]);
      break;
      
    case 'list-migrations':
      await listMigrations();
      break;
      
    case 'run-migrations':
      await runMigrations();
      break;
      
    case 'list-functions':
    case 'functions':
      await listFunctions();
      break;
      
    case 'list-triggers':
    case 'triggers':
      await listTriggers();
      break;
      
    case 'list-indexes':
    case 'indexes':
      await listIndexes();
      break;
      
    case 'list-all':
    case 'all':
      await listAllObjects();
      break;
      
    case 'help':
      showHelp();
      break;
      
    default:
      console.error('❌ 未知命令');
      showHelp();
      process.exit(1);
  }
}

// 执行主函数
main().catch(err => {
  console.error('❌ 程序执行出错:', err.message);
  process.exit(1);
});
