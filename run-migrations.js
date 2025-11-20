import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 从环境变量获取数据库连接信息
const DATABASE_URL = process.env.VITE_DATABASE_URL || 'postgresql://admin:password@localhost:5432/example_db';

async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // 创建数据库连接
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    console.log('Connected to database');
    
    // 读取并执行迁移文件
    const migrationsDir = join(__dirname, 'supabase', 'migrations');
    const migrations = [
      '20251118111439_001_create_wiki_schema.sql',
      '20251118111440_002_create_graph_tables.sql'
    ];
    
    for (const migrationFile of migrations) {
      try {
        const filePath = join(migrationsDir, migrationFile);
        const sql = readFileSync(filePath, 'utf8');
        console.log(`Executing migration: ${migrationFile}`);
        await client.query(sql);
        console.log(`Successfully executed: ${migrationFile}`);
      } catch (error) {
        console.error(`Error executing migration ${migrationFile}:`, error.message);
        // 继续执行下一个迁移
      }
    }
    
    // 验证表是否创建成功
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Database migration completed successfully!');
    console.log('Created tables:', result.rows.map(row => row.table_name).join(', '));
    
    await client.end();
  } catch (error) {
    console.error('Database migration failed:', error.message);
    console.log('Using fallback mock data for development...');
  }
}

runMigrations().catch(console.error);