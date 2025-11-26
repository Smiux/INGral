import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { Client } from 'pg';

// 加载.env文件中的环境变量
dotenv.config();

// 尝试加载.env.local文件
try {
  const envLocalPath = join(process.cwd(), '.env.local');
  dotenv.config({ path: envLocalPath });
  console.log('已加载.env.local文件中的环境变量');
} catch {
  console.log('未找到.env.local文件，使用默认环境变量');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 获取数据库配置，支持多种环境变量名
const DATABASE_URL = process.env.DATABASE_URL || 
                     process.env.VITE_DATABASE_URL || 
                     process.env.SUPABASE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误: 未找到数据库连接字符串环境变量');
  console.error('请确保配置了以下环境变量之一: DATABASE_URL, VITE_DATABASE_URL 或 SUPABASE_DATABASE_URL');
  console.error('当前环境变量:');
  console.error(`   DATABASE_URL: ${process.env.DATABASE_URL}`);
  console.error(`   VITE_DATABASE_URL: ${process.env.VITE_DATABASE_URL}`);
  console.error(`   SUPABASE_DATABASE_URL: ${process.env.SUPABASE_DATABASE_URL}`);
  process.exit(1);
}

async function runMigrations() {
    console.log('🚀 开始执行数据库迁移...');
    console.log(`📋 数据库连接字符串: ${DATABASE_URL.replace(/:[^:]+@/, ':***@')}`);
    
    // 解析连接字符串，根据是否为本地连接决定是否使用SSL
    const isLocalConnection = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
    
    // 创建数据库连接
    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: isLocalConnection ? false : {
        rejectUnauthorized: false // 完全忽略SSL证书验证，仅用于开发环境
      }
    });
  
  try {
    // 连接到数据库
    await client.connect();
    console.log('✅ 成功连接到数据库');
    
    // 获取迁移目录
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
    
    // 读取迁移文件并按文件名排序（确保按时间顺序执行）
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      console.log('📭 未找到迁移文件');
      return;
    }
    
    console.log(`📋 找到 ${migrationFiles.length} 个迁移文件:`);
    migrationFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    // 执行迁移文件
    for (const migrationFile of migrationFiles) {
      console.log(`\n🔧 执行迁移: ${migrationFile}`);
      
      const filePath = join(migrationsDir, migrationFile);
      const sql = readFileSync(filePath, 'utf8');
      
      try {
        // 开始事务
        await client.query('BEGIN');
        
        // 拆分SQL语句并执行
        const sqlStatements = sql.split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--')); // 过滤空语句和注释
        
        console.log(`   💬 包含 ${sqlStatements.length} 个SQL语句`);
        
        for (let i = 0; i < sqlStatements.length; i++) {
          const statement = sqlStatements[i];
          const shortStmt = statement.length > 100 ? statement.substring(0, 100) + '...' : statement;
          
          try {
            console.log(`   ${i + 1}. 执行: ${shortStmt}`);
            const result = await client.query(statement);
            
            if (result.command) {
              console.log(`   ✅ 成功: ${result.command}`);
              if (result.rowCount !== undefined && result.rowCount > 0) {
                console.log(`       影响行数: ${result.rowCount}`);
              }
            }
          } catch (stmtError) {
            await client.query('ROLLBACK');
            console.error(`\n❌ 迁移失败: ${migrationFile}`);
            console.error(`   📝 语句: ${shortStmt}`);
            console.error(`   ❌ 错误: ${stmtError.message}`);
            
            if (stmtError.position) {
              console.error(`   📍 错误位置: 第 ${stmtError.position} 个字符`);
            }
            if (stmtError.detail) {
              console.error(`   📋 详细信息: ${stmtError.detail}`);
            }
            if (stmtError.hint) {
              console.error(`   💡 提示: ${stmtError.hint}`);
            }
            if (stmtError.schema) {
              console.error(`   📁 模式: ${stmtError.schema}`);
            }
            if (stmtError.table) {
              console.error(`   📊 表: ${stmtError.table}`);
            }
            if (stmtError.column) {
              console.error(`   📋 列: ${stmtError.column}`);
            }
            
            // 打印完整的错误对象，方便调试
            console.error(`\n   📋 完整错误对象:`);
            console.error(stmtError);
            
            process.exit(1);
          }
        }
        
        // 提交事务
        await client.query('COMMIT');
        console.log(`✅ 迁移成功: ${migrationFile}`);
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ 迁移处理失败: ${migrationFile}`);
        console.error(`   错误: ${error.message}`);
        process.exit(1);
      }
    }
    
    // 验证迁移结果
    console.log('\n✅ 所有迁移执行完成!');
    
    // 列出所有表和视图，验证迁移结果
    const { rows: tables } = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_type, table_name;
    `);
    
    console.log('\n📋 数据库中的表和视图:');
    tables.forEach(table => {
      const type = table.table_type === 'BASE TABLE' ? '表' : '视图';
      console.log(`   ${type}: ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ 迁移过程中发生错误:');
    console.error(`   错误: ${error.message}`);
    if (error.code) {
      console.error(`   错误代码: ${error.code}`);
    }
    if (error.stack) {
      console.error(`   堆栈跟踪: ${error.stack}`);
    }
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await client.end();
    console.log('\n👋 已断开数据库连接');
  }
}

runMigrations();
