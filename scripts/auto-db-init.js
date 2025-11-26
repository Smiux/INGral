import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// 加载.env文件中的环境变量
dotenv.config();

// 尝试加载.env.local文件
try {
  // 使用绝对路径确保能找到.env.local文件
  const envLocalPath = join(process.cwd(), '.env.local');
  console.log(`检查.env.local文件路径: ${envLocalPath}`);
  
  if (existsSync(envLocalPath)) {
    console.log('找到并加载.env.local文件中的环境变量');
    const envConfig = dotenv.parse(readFileSync(envLocalPath, 'utf8'));
    for (const key in envConfig) {
      if (Object.prototype.hasOwnProperty.call(envConfig, key)) {
        console.log(`设置环境变量: ${key}`);
        process.env[key] = envConfig[key];
      }
    }
  } else {
    console.log('未找到.env.local文件');
  }
} catch (error) {
  console.error('加载.env.local文件失败:', error.message);
}

// 获取Supabase配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

// 验证必要的环境变量
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('错误: 未设置必要的环境变量，请确保VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY已配置');
  process.exit(1);
}

// 创建两个客户端实例以区分权限级别
// 1. 高权限客户端 - 仅在需要表创建、权限设置等操作时使用
let supabaseServiceRole = null;
if (SUPABASE_SERVICE_ROLE_KEY) {
  console.log('已配置service role key，将用于高权限操作');
  supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

// 2. 普通权限客户端 - 用于常规操作
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 初始化数据库的主函数

// 初始化数据库的主函数
async function initializeDatabase() {
  try {
    console.log('开始初始化数据库...');
    
    // 验证连接
    const { error } = await supabase.from('articles').select('id').limit(1);
    if (error) {
      console.error('数据库连接失败:', error.message);
      return { success: false, error: error.message };
    }
    
    console.log('数据库连接成功!');
    
    // 如果配置了service role key，则执行高权限操作
    if (supabaseServiceRole) {
      console.log('使用高权限客户端执行额外操作...');
      
      // 这里可以添加需要高权限的操作
    }
    
    console.log('数据库初始化完成!');
    return { success: true };
  } catch (err) {
    console.error('数据库初始化过程中发生错误:', err.message);
    return { success: false, error: err.message };
  }
}

// 执行初始化
if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  initializeDatabase()
    .then(result => {
      if (result.success) {
        console.log('数据库初始化成功完成!');
      } else {
        console.error('数据库初始化失败:', result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('发生未处理的错误:', err);
      process.exit(1);
    });
}

export { initializeDatabase, supabase };