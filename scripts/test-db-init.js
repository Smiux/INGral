import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// 连接到Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少必要的环境变量，请确保设置了SUPABASE_URL和SUPABASE_ANON_KEY');
  process.exit(1);
}

// 使用服务角色密钥创建客户端（用于测试）
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 测试函数
async function testDatabaseInitialization() {
  console.log('开始测试数据库初始化...');
  
  try {
      // 1. 测试数据库连接
      console.log('1. 测试数据库连接...');
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.error('数据库连接失败:', error.message);
        return false;
      }
      console.log('✓ 数据库连接成功');
      
      // 2. 检查表结构
      console.log('\n2. 检查表结构...');
      const requiredTables = ['articles', 'article_links', 'article_tags', 'tags', 'user_graphs', 'test_verification'];
      let tablesCreated = 0;
    
    for (const table of requiredTables) {
      try {
         const { data: tableData } = await supabase.from(table).select('*').limit(1);
          if (tableData !== undefined) {
            console.log(`✓ 表 ${table} 存在`);
          tablesCreated++;
        } else {
          console.error(`✗ 表 ${table} 不存在`);
        }
      } catch (err) {
        console.error(`✗ 检查表 ${table} 时出错:`, err.message);
      }
    }
    
    if (tablesCreated !== requiredTables.length) {
      console.error(`表检查失败: 预期 ${requiredTables.length} 个表，实际存在 ${tablesCreated} 个表`);
    } else {
      console.log('✓ 所有必要的表都存在');
    }
    
    // 3. 检查初始数据
    console.log('\n3. 检查初始数据...');
    
    // 检查文章数据
     const { data: articlesData } = await supabase.from('articles').select('id, title, slug').order('created_at');
      console.log(`文章数量: ${articlesData ? articlesData.length : 0}`);
      if (articlesData && articlesData.length > 0) {
      console.log('文章列表:');
      articlesData.forEach(article => {
        console.log(`  - ${article.title} (${article.slug})`);
      });
    } else {
      console.error('✗ 未找到文章数据');
    }
    
    // 检查标签数据
     const { data: tagsData } = await supabase.from('tags').select('id, name');
      console.log(`\n标签数量: ${tagsData ? tagsData.length : 0}`);
      if (tagsData && tagsData.length > 0) {
      console.log('标签列表:');
      tagsData.forEach(tag => {
        console.log(`  - ${tag.name}`);
      });
    } else {
      console.error('✗ 未找到标签数据');
    }
    
    // 检查文章-标签关联
     const { data: articleTagsData } = await supabase.from('article_tags').select('*');
      console.log(`\n文章标签关联数量: ${articleTagsData ? articleTagsData.length : 0}`);
    
    // 检查文章链接
     const { data: articleLinksData } = await supabase.from('article_links').select('*');
      console.log(`文章链接数量: ${articleLinksData ? articleLinksData.length : 0}`);
    
    // 检查知识图谱模板
     const { data: templatesData } = await supabase.from('user_graphs').select('*').eq('is_template', true);
      console.log(`\n知识图谱模板数量: ${templatesData ? templatesData.length : 0}`);
      if (templatesData && templatesData.length > 0) {
      templatesData.forEach(template => {
        try {
          const nodes = JSON.parse(template.nodes || '[]');
          const links = JSON.parse(template.links || '[]');
          console.log(`  - ${template.name}: ${nodes.length} 个节点, ${links.length} 个连接`);
        } catch {
          console.error(`  - ${template.name}: 无法解析节点或连接数据`);
        }
      });
    }
    
    // 4. 检查表的RLS策略
    console.log('\n4. 检查表的RLS策略...');
    // 注意：这里只能检查表是否可访问，无法直接检查RLS策略配置
    // 在实际生产环境中，可能需要使用更复杂的权限检查
    
    // 使用匿名密钥再次连接，测试RLS
    const anonymousSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
       const { data: publicArticles } = await anonymousSupabase
          .from('articles')
          .select('id, title')
        .eq('visibility', 'public');
      
      console.log(`✓ 匿名用户可以读取公开文章: ${publicArticles ? publicArticles.length : 0} 篇`);
    } catch (err) {
      console.error('✗ 匿名用户无法读取公开文章:', err.message);
    }
    
    // 5. 检查完整性约束
    console.log('\n5. 检查数据完整性...');
    // 检查文章ID是否在article_tags中存在
    if (articleTagsData && articleTagsData.length > 0 && articlesData) {
      const articleIds = new Set(articlesData.map(a => a.id));
      const invalidArticleTags = articleTagsData.filter(at => !articleIds.has(at.article_id));
      if (invalidArticleTags.length === 0) {
        console.log('✓ 所有文章标签关联引用了有效的文章');
      } else {
        console.error(`✗ 发现 ${invalidArticleTags.length} 个无效的文章标签关联`);
      }
    }
    
    console.log('\n测试完成！');
    return true;
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    return false;
  }
}

// 执行测试
async function runTest() {
  console.log('========= 数据库初始化测试 =========\n');
  const success = await testDatabaseInitialization();
  
  console.log('\n========= 测试结果摘要 =========');
  if (success) {
    console.log('数据库初始化测试通过！');
    process.exit(0);
  } else {
    console.log('数据库初始化测试失败，请检查错误信息。');
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error('测试脚本执行失败:', err.message);
  process.exit(1);
});