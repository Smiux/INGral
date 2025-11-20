import type { SupabaseClient } from '@supabase/supabase-js';

// 由于项目将通过其他方式连接到真实数据库，这里直接导出null
// 所有数据库操作将通过新的连接方式处理
export const supabase: SupabaseClient | null = null;

// 导出模拟数据模式标志，始终为true
export const useMockData = true;

// 移除测试连接函数，不再需要测试数据库连接
export async function testSupabaseConnection(): Promise<boolean> {
  return false;
}
