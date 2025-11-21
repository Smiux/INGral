import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// 验证环境变量是否已设置
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('错误: Supabase环境变量未配置，需要设置VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY');
  throw new Error('Supabase配置缺失');
}

// 创建并导出真实的Supabase客户端
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 测试Supabase连接的函数
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    // 尝试获取会话信息来测试连接
    await supabase.auth.getSession();
    console.log('数据库连接测试成功');
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
}
