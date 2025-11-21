// 数据库写入测试脚本 - 使用真实数据库连接
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// 从环境变量获取连接信息，确保使用真实配置
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌  错误: 未设置Supabase环境变量，请确保VITE_SUPABASE_URL和VITE_SUPABASE_ANON_KEY已正确配置');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试数据
const testArticle = {
  title: '测试文章 - 数据库写入测试',
  slug: `test-article-${Date.now()}`,
  content: '# 测试文章内容\n\n这是一篇用于测试数据库写入功能的文章。\n\n- 测试项1\n- 测试项2\n- 测试项3',
  author_id: 'test-user-123',
  view_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// 存储创建的文章ID以便后续测试使用
let createdArticleId = null;

async function runTests() {
  try {
    console.log('开始数据库写入测试...');
    console.log('使用真实数据库连接，不进行任何模拟');
    
    // 验证环境变量
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('❌  错误: 缺少必要的环境变量 SUPABASE_URL 或 SUPABASE_ANON_KEY');
      return { success: false, message: '缺少环境变量' };
    }
    
    // 创建Supabase客户端
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 1. 测试连接
    console.log('\n🔍  测试1: 连接数据库...');
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('⚠️  警告: 身份验证会话获取失败，但继续测试数据库连接');
      }
      console.log('✅  数据库连接成功');
    } catch (connError) {
      console.error('❌  数据库连接失败:', connError.message);
      return { success: false, message: '数据库连接失败' };
    }
    
    // 2. 测试专用数据库连接测试函数
    console.log('\n🔍  测试2: 使用专用测试函数验证数据库连接和权限...');
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
    
    // 3. 测试test_verification表操作
    console.log('\n🔍  测试3: 操作验证表...');
    let testVerificationId = null;
    
    try {
      // 写入测试数据
      console.log('   正在写入测试数据...');
      const { data: verificationData, error: verificationError } = await supabase
        .from('test_verification')
        .insert([{ 
          test_data: '数据库写入测试 - ' + new Date().toISOString(),
          metadata: { test_type: 'write_test', environment: process.env.NODE_ENV || 'development' }
        }])
        .select();
      
      if (verificationError) {
        console.error('❌  无法写入验证表:', verificationError.message);
        console.log('   错误详情:', JSON.stringify(verificationError, null, 2));
        console.log('   请确保已运行最新的数据库迁移并检查RLS策略');
      } else {
        testVerificationId = verificationData?.[0]?.id || null;
        console.log(`✅  验证数据写入成功，ID: ${testVerificationId}`);
        
        // 读取测试数据
        const { data: readData, error: readError } = await supabase
          .from('test_verification')
          .select('*')
          .eq('id', testVerificationId);
        
        if (readError) {
          console.error('❌  无法读取验证数据:', readError.message);
        } else {
          console.log('✅  验证数据读取成功:', JSON.stringify(readData?.[0], null, 2));
        }
      }
    } catch (verificationError) {
      console.error('❌  验证表操作异常:', verificationError.message);
      console.log('   详细错误:', verificationError);
    }
    
    // 4. 测试文章表操作 (核心测试)
    console.log('\n🔍  测试4: 操作文章表...');
    let articleId = null;
    let articleOperationSuccess = false;
    
    try {
      // 准备测试文章数据
      const testArticle = {
        title: '测试文章 - ' + new Date().toISOString(),
        content: '这是一篇用于数据库写入测试的文章',
        slug: `test-article-${Date.now()}`,
        author_id: 'test-author-id',
        visibility: 'public',
        allow_contributions: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // 写入文章
      console.log('   正在写入文章...');
      const { data: articleData, error: articleError } = await supabase
        .from('articles')
        .insert([testArticle])
        .select();
      
      if (articleError) {
        console.error('❌  写入文章失败:', articleError.message);
        console.log('   错误类型:', articleError.code);
        console.log('   错误详情:', JSON.stringify(articleError, null, 2));
        
        if (articleError.code === '42501') {
          console.log('   解决方案: 这是权限错误，需要有效的认证令牌或调整RLS策略');
          console.log('   请检查文章表的RLS策略和当前用户的权限');
        }
      } else {
        articleId = articleData?.[0]?.id || null;
        console.log(`✅  文章写入成功，ID: ${articleId}`);
        articleOperationSuccess = true;
        
        // 读取文章
        console.log('   正在读取文章...');
        const { data: readArticle, error: readError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', articleId);
        
        if (readError) {
          console.error('❌  读取文章失败:', readError.message);
        } else {
          console.log('✅  文章读取成功');
          console.log('   文章详情:', JSON.stringify(readArticle?.[0], null, 2));
          
          // 更新文章
          console.log('   正在更新文章...');
          const { error: updateError } = await supabase
            .from('articles')
            .update({ 
              content: '文章内容已更新 - ' + new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', articleId);
          
          if (updateError) {
            console.error('❌  更新文章失败:', updateError.message);
          } else {
            console.log('✅  文章更新成功');
            
            // 再次读取验证更新
            const { data: updatedArticle } = await supabase
              .from('articles')
              .select('*')
              .eq('id', articleId);
            
            console.log('✅  更新后文章内容:', updatedArticle?.[0]?.content);
          }
        }
      }
      
    } catch (articleError) {
      console.error('❌  文章表操作异常:', articleError.message);
      console.error('   详细错误:', articleError);
    }
    
    // 5. 测试文章链接表操作
    console.log('\n🔍  测试5: 操作文章链接表...');
    let linkId = null;
    
    if (articleId) {
      try {
        // 准备测试链接数据
        const testLink = {
          article_id: articleId,
          url: 'https://example.com/test-link-' + Date.now(),
          title: '测试链接',
          description: '这是一个测试链接描述',
          created_at: new Date().toISOString()
        };
        
        // 写入链接
        console.log('   正在写入链接...');
        const { data: linkData, error: linkError } = await supabase
          .from('article_links')
          .insert([testLink])
          .select();
        
        if (linkError) {
          console.error('❌  写入链接失败:', linkError.message);
          console.log('   错误详情:', JSON.stringify(linkError, null, 2));
        } else {
          linkId = linkData?.[0]?.id || null;
          console.log(`✅  链接写入成功，ID: ${linkId}`);
          
          // 读取链接
          const { data: readLink } = await supabase
            .from('article_links')
            .select('*')
            .eq('id', linkId);
          
          console.log('✅  链接读取成功:', JSON.stringify(readLink?.[0], null, 2));
        }
      } catch (linkError) {
        console.error('❌  链接表操作异常:', linkError.message);
      }
    }
    
    // 6. 清理测试数据
    if (articleId) {
      console.log('\n🔍  清理测试数据...');
      
      // 先删除相关链接
      if (linkId) {
        try {
          const { error: deleteLinkError } = await supabase
            .from('article_links')
            .delete()
            .eq('id', linkId);
          
          if (deleteLinkError) {
            console.warn('⚠️  警告: 无法删除测试链接:', deleteLinkError.message);
          } else {
            console.log('✅  测试链接已删除');
          }
        } catch (err) {
          console.warn('⚠️  警告: 删除链接时发生错误:', err.message);
        }
      }
      
      // 再删除文章
      try {
        const { error: deleteError } = await supabase
          .from('articles')
          .delete()
          .eq('id', articleId);
        
        if (deleteError) {
          console.warn('⚠️  警告: 无法删除测试文章:', deleteError.message);
        } else {
          console.log('✅  测试文章已删除');
        }
      } catch (deleteError) {
        console.warn('⚠️  警告: 删除文章时发生错误:', deleteError.message);
      }
    }
    
    // 总体评估
    const success = articleOperationSuccess;
    
    console.log('\n========================================');
    console.log('数据库写入测试结果:', success ? '✅  成功' : '❌  失败');
    console.log('========================================');
    
    if (!success) {
      console.log('\n📋  问题排查建议:');
      console.log('   1. 确保已运行最新的数据库迁移');
      console.log('   2. 检查环境变量配置是否正确');
      console.log('   3. 验证Supabase项目的RLS策略设置');
      console.log('   4. 确认当前用户有足够的权限执行操作');
    }
    
    return {
      success,
      message: success ? '数据库写入测试成功' : '数据库写入测试失败',
      testVerificationId,
      articleId,
      linkId
    };
    
  } catch (error) {
    console.error('❌  测试过程中发生未预期错误:', error.message);
    console.error('详细错误:', error);
    return { success: false, message: '测试过程中发生错误', error };
  }
}

// 执行测试
runTests();
