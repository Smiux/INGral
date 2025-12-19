import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase客户端配置和初始化
 *
 * 安全注意事项：
 * - 客户端只能使用VITE_前缀的环境变量，确保敏感信息不会暴露
 * - 服务端密钥(SUPABASE_SERVICE_ROLE_KEY)绝对不应在客户端代码中访问
 * - 所有敏感操作应通过服务端API进行处理
 */

// 从环境变量获取Supabase配置
const getSupabaseConfig = (): { url: string; anonKey: string } => {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  // 检查环境变量是否已设置
  if (!url || !anonKey) {
    console.warn('警告: Supabase环境变量未完全配置。应用将以有限功能模式运行。');

    // 提供模拟值以避免应用崩溃
    return {
      'url': url || 'https://mock-url.supabase.co',
      'anonKey': anonKey || 'mock-anon-key'
    };
  }

  return { url, anonKey };
};

// 创建模拟Supabase客户端，用于开发和测试环境
const createMockSupabaseClient = (): SupabaseClient => {
  console.warn('使用模拟Supabase客户端以允许UI正常加载');

  return {
    'auth': {
      'getSession': async () => ({ 'data': { 'session': null } }),
      'onAuthStateChange': () => ({ 'data': { 'subscription': { 'unsubscribe': () => {} } } }),
      'signUp': async () => ({ 'data': null, 'error': { 'message': 'Authentication not available' } }),
      'signInWithPassword': async () => ({ 'data': null, 'error': { 'message': 'Authentication not available' } }),
      'signOut': async () => ({}),
      'update': async () => ({ 'data': null, 'error': null }),
      'refreshSession': async () => ({ 'data': { 'session': null }, 'error': null })
    },
    'from': () => ({
      'select': () => ({
        'eq': () => ({
          'limit': () => ({ 'data': [], 'error': null }),
          'order': () => ({ 'data': [], 'error': null }),
          'single': () => Promise.resolve({ 'data': null, 'error': null })
        }),
        'in': () => ({ 'data': [], 'error': null }),
        'range': () => ({ 'data': [], 'error': null })
      }),
      'insert': () => ({ 'data': [], 'error': null }),
      'update': () => ({ 'data': [], 'error': null }),
      'delete': () => ({ 'data': [], 'error': null }),
      'upsert': () => ({ 'data': [], 'error': null })
    }),
    'functions': {
      'invoke': async () => null,
      'createClient': () => ({ 'invoke': async () => null })
    },
    'storage': {
      'from': () => ({
        'upload': async () => ({ 'data': null, 'error': null }),
        'download': async () => ({ 'data': null, 'error': null }),
        'remove': async () => ({ 'data': [], 'error': null }),
        'getPublicUrl': () => ({ 'publicUrl': '' })
      })
    }
  } as unknown as SupabaseClient;
};

// 初始化Supabase客户端
let supabase: SupabaseClient;

try {
  const { url, anonKey } = getSupabaseConfig();
  supabase = createClient(url, anonKey);
  console.log('Supabase客户端已成功初始化');
} catch (error) {
  console.error('初始化Supabase客户端时出错:', error instanceof Error ? error.message : String(error));
  supabase = createMockSupabaseClient();
}

/**
 * 测试Supabase连接的健康状态
 * @returns 连接是否成功
 */
export async function testSupabaseConnection (): Promise<boolean> {
  try {
    // 尝试查询articles表的计数来测试连接
    await supabase.from('articles').select('id', { 'count': 'exact', 'head': true });
    console.log('数据库连接测试成功');
    return true;
  } catch (error) {
    console.error('数据库连接测试失败:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// 导出Supabase客户端
export { supabase };
