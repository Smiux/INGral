/**
 * 数据库初始化服务
 * 提供数据库表结构检查、完整性验证和健康检查功能
 */
import { supabase } from '../lib/supabase';

/**
 * 安全地检查Supabase客户端是否可用
 * @returns {boolean} Supabase客户端是否可用
 */
function isSupabaseAvailable(): boolean {
  return !!supabase && typeof supabase === 'object';
}

/**
 * 应用所需的核心数据库表列表
 */
export const REQUIRED_TABLES = [
  'articles',
  'article_links',
  'tags',
  'article_tags',
  'user_graphs',
  'test_verification'
];

/**
 * 检查数据库表是否存在
 * @returns {Promise<boolean[]>} 每个表的存在状态数组，索引与REQUIRED_TABLES对应
 */
export async function checkDatabaseTables(): Promise<boolean[]> {
  // 如果supabase不可用，返回所有表不存在的状态
  if (!isSupabaseAvailable()) {
    console.warn('Supabase客户端不可用，跳过表检查');
    return REQUIRED_TABLES.map(() => false);
  }
  
  const results: boolean[] = [];
  
  for (const table of REQUIRED_TABLES) {
    try {
      if (!supabase || !supabase.from || typeof supabase.from !== 'function') {
        results.push(false);
        continue;
      }
      
      const { error } = await supabase.from(table).select('*').limit(1);
      // 如果没有错误或者错误不是表不存在，则认为表存在
      // 错误代码42P01表示"表不存在"
      results.push(!error || error.code !== '42P01');
    } catch (error) {
      console.warn(`检查表${table}时出错:`, error);
      // 发生异常，认为表不存在
      results.push(false);
    }
  }
  
  return results;
}

/**
 * 数据库完整性检查结果类型
 */
export interface DatabaseIntegrityResult {
  /** 是否所有表都存在 */
  allTablesExist: boolean;
  /** 缺少的表列表 */
  missingTables: string[];
}

/**
 * 检查数据库完整性
 * @returns {Promise<DatabaseIntegrityResult>} 数据库完整性检查结果
 */
export async function checkDatabaseIntegrity(): Promise<DatabaseIntegrityResult> {
  const tableStatuses = await checkDatabaseTables();
  const allTablesExist = tableStatuses.every(status => status);
  
  const missingTables = REQUIRED_TABLES.filter((_, index) => !tableStatuses[index]);
  
  return {
    allTablesExist,
    missingTables
  };
}

/**
 * 数据库初始化结果类型
 */
export interface DatabaseInitializationResult {
  /** 初始化是否成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 缺少的表列表（仅当success为false时） */
  missingTables?: string[];
  /** 错误信息（仅当success为false时） */
  error?: string;
}

/**
 * 在浏览器中触发数据库初始化
 * 注意：由于浏览器环境的限制，这里只是提示用户运行初始化脚本
 * @returns {Promise<DatabaseInitializationResult>} 初始化结果
 */
export async function initializeDatabaseInBrowser(): Promise<DatabaseInitializationResult> {
  try {
    // 首先检查数据库完整性
    const { allTablesExist, missingTables } = await checkDatabaseIntegrity();
    
    if (allTablesExist) {
      console.log('数据库表结构完整');
      return { 
        success: true, 
        message: '数据库表结构完整' 
      };
    } else {
      console.warn('发现缺少的表:', missingTables);
      
      // 在开发环境中，可以提示用户运行初始化脚本
      if (process.env.NODE_ENV === 'development') {
        console.info(
          '\n=========================================\n' +
          '数据库初始化提示:\n' +
          '缺少以下表:', missingTables.join(', ') + '\n' +
          '请在终端运行以下命令初始化数据库:\n' +
          'npm run db:init\n' +
          '=========================================\n'
        );
      }
      
      return {
        success: false, 
        message: `缺少必要的数据库表: ${missingTables.join(', ')}`,
        missingTables
      };
    }
  } catch (error) {
    console.error('检查数据库完整性时出错:', error);
    return {
      success: false,
      message: '检查数据库完整性失败',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 数据库健康状态类型
 */
export type DatabaseHealthStatus = 'healthy' | 'warning' | 'error';

/**
 * 数据库健康检查结果类型
 */
export interface DatabaseHealthCheckResult {
  /** 健康状态 */
  status: DatabaseHealthStatus;
  /** 状态消息 */
  message: string;
  /** 是否为有限功能模式（仅当status为warning时） */
  isLimitedMode?: boolean;
  /** 缺少的表列表（仅当status为warning时） */
  missingTables?: string[];
  /** 错误信息（仅当status为error时） */
  error?: string;
}

/**
 * 应用启动时的数据库健康检查
 * @returns {Promise<DatabaseHealthCheckResult>} 健康检查结果
 */
export async function performDatabaseHealthCheck(): Promise<DatabaseHealthCheckResult> {
  console.log('开始数据库健康检查...');
  
  try {
    // 首先检查supabase是否可用
    if (!isSupabaseAvailable()) {
      console.warn('Supabase客户端不可用，应用将以有限功能模式运行');
      return {
        status: 'warning',
        message: 'Supabase服务不可用，UI功能可用但数据功能受限',
        isLimitedMode: true
      };
    }
    
    // 测试Supabase连接和表完整性
    const integrityResult = await checkDatabaseIntegrity();
    
    if (integrityResult.allTablesExist) {
      console.log('数据库健康检查通过 - 所有表都存在');
      return {
        status: 'healthy',
        message: '数据库连接正常，所有表结构完整'
      };
    } else {
      console.warn(`数据库健康检查警告 - 缺少表: ${integrityResult.missingTables.join(', ')}`);
      return {
        status: 'warning',
        message: `数据库连接正常，但缺少表: ${integrityResult.missingTables.join(', ')}`,
        missingTables: integrityResult.missingTables
      };
    }
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    return {
      status: 'error',
      message: '数据库连接失败',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
