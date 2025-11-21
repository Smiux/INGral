import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 从环境变量获取Supabase配置，确保使用真实配置
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌  错误: 未设置Supabase环境变量，请确保VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY已正确配置');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试数据定义
const testData = {
  title: '测试验证 - 数据库连接',
  content: '这是用于验证数据库连接的数据'
};

// 记录ID，用于后续删除
let testRecordIds = {
  articleId: null,
  linkId: null,
  verificationId: null
};

// 验证Supabase连接 - 使用新的测试表和函数
async function validateConnection() {
  console.log('🔍  开始验证数据库连接...');
  
  try {
    // 1. 测试基本连接
    console.log('步骤1: 测试基本连接');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.warn('⚠️  警告: 身份验证会话获取失败，但继续测试数据库连接', authError.message);
    } else {
      console.log('✅  身份验证会话获取成功');
    }
    
    // 2. 测试表查询 - 检查我们需要的关键表是否存在
    console.log('\n🔍  测试表查询权限...');
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .limit(10);
    
    if (tablesError) {
      console.error('❌  表查询失败:', tablesError.message);
      console.log('\n请检查数据库权限配置');
      return {
        success: false,
        message: '表查询失败',
        recordIds: testRecordIds
      };
    }
    
    console.log(`✅  表查询成功，发现 ${tables?.length || 0} 个表`);
    tables?.forEach(table => console.log(`   - ${table.tablename}`));
    
    // 检查关键表是否存在
    const requiredTables = ['articles', 'article_links', 'user_graphs', 'test_verification'];
    let missingTables = [];
    
    if (tables) {
      const existingTables = tables.map(table => table.tablename);
      missingTables = requiredTables.filter(table => !existingTables.includes(table));
    }
    
    if (missingTables.length > 0) {
      console.warn('⚠️  警告: 缺少以下关键表:', missingTables.join(', '));
      console.warn('   请运行数据库迁移以创建这些表');
    }
    
    // 3. 使用我们创建的专门函数测试数据库连接和权限
    console.log('\n🔍  使用专用测试函数验证数据库连接...');
    try {
      const { data: functionResult, error: functionError } = await supabase.rpc('test_database_connection');
      
      if (functionError) {
        console.error('❌  测试函数执行失败:', functionError.message);
        console.log('   可能是函数不存在，请先运行最新的数据库迁移');
      } else {
        console.log('✅  测试函数执行成功');
        console.log('   结果:', JSON.stringify(functionResult, null, 2));
      }
    } catch (err) {
      console.error('❌  测试函数调用失败:', err.message);
    }
    
    // 4. 测试 test_verification 表操作
    console.log('\n🔍  测试验证表操作...');
    try {
      // 尝试写入测试数据
      const { data: insertData, error: insertError } = await supabase
        .from('test_verification')
        .insert([{ test_data: 'Connection validation test - ' + new Date().toISOString() }])
        .select();
      
      if (insertError) {
        console.error('❌  无法写入测试验证数据:', insertError.message);
        console.log('\n请注意：如果是权限问题，请检查RLS策略配置');
        console.log('   错误详情:', JSON.stringify(insertError, null, 2));
      } else {
        testRecordIds.verificationId = insertData?.[0]?.id || null;
        console.log('✅  测试验证数据写入成功');
        console.log('   插入的数据ID:', testRecordIds.verificationId);
        
        // 尝试读取测试验证数据
        const { data: readData, error: readError } = await supabase
          .from('test_verification')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (readError) {
          console.error('❌  无法读取测试验证数据:', readError.message);
        } else {
          console.log('✅  测试验证数据读取成功');
          if (readData && readData.length > 0) {
            console.log('   最新数据内容:', JSON.stringify(readData[0], null, 2));
          }
        }
      }
    } catch (err) {
      console.error('❌  测试验证表操作失败:', err.message);
      console.log('⚠️  可能是表不存在，请确保已运行最新的数据库迁移');
    }
    
    // 5. 测试文章表操作
    console.log('\n🔍  测试文章表操作...');
    let articleOperationSuccess = false;
    try {
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('id, title')
        .limit(3);
      
      if (articlesError) {
        console.error('❌  无法读取文章数据:', articlesError.message);
        console.log('   错误详情:', JSON.stringify(articlesError, null, 2));
        console.log('   请检查RLS策略和表权限');
      } else {
        console.log(`✅  文章数据读取成功，发现 ${articles?.length || 0} 篇文章`);
        articles?.forEach(article => console.log(`   - ${article.title}`));
        
        // 尝试创建文章（注意：这里使用auth.uid()会在未认证状态下失败，这是预期行为）
        try {
          console.log('\n🔍  测试文章创建（可能会失败，如果未认证）...');
          const { data: newArticle, error: createError } = await supabase
            .from('articles')
            .insert([{
              title: '测试文章 - 数据库连接验证',
              content: '这是一篇用于验证数据库连接的测试文章',
              slug: `test-article-${Date.now()}`,
              author_id: 'test-author-id',
              visibility: 'public',
              allow_contributions: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select();
          
          if (createError) {
            console.warn('⚠️  文章创建失败（这可能是预期行为，因为需要认证）:', createError.message);
            console.log('   错误类型:', createError.code);
            if (createError.code === '42501') {
              console.log('   解决方案: 确保使用有效的认证令牌或调整RLS策略');
            }
          } else {
            testRecordIds.articleId = newArticle?.[0]?.id || null;
            console.log('✅  文章数据写入成功');
            console.log('   文章ID:', testRecordIds.articleId);
            articleOperationSuccess = true;
          }
        } catch (err) {
          console.error('❌  文章创建操作失败:', err.message);
        }
      }
    } catch (err) {
      console.error('❌  文章表操作失败:', err.message);
    }
    
    // 评估测试结果
    const hasCriticalError = missingTables.includes('articles') || !articleOperationSuccess;
    
    console.log('\n数据库连接验证完成!');
    console.log('\n测试记录ID (用于后续清理):', testRecordIds);
    
    return {
      success: !hasCriticalError,
      message: hasCriticalError ? '数据库连接验证完成，但存在关键错误' : '数据库连接验证成功完成',
      recordIds: testRecordIds
    };
    
  } catch (error) {
    console.error('数据库连接验证失败:', error.message);
    return {
      success: false,
      message: error.message,
      recordIds: testRecordIds
    };
  }
}

// 主函数
async function main() {
  try {
    const result = await validateConnection();
    
    if (result.success) {
      console.log('\n🎉 数据库连接和操作测试成功!');
    } else {
      console.error('\n❌ 数据库测试完成，但存在关键错误');
      console.error('请检查数据库配置、表结构和权限设置');
      process.exit(1);
    }
    
    console.log('\n接下来可以运行清理脚本来删除测试数据');
    return result;
  } catch (error) {
    console.error('验证过程中出现严重错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 运行主函数
main();
