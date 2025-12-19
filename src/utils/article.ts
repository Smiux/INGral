import { ArticleVisibility, type Article, type ArticleLink, type Tag, type Graph, type GraphNode, type GraphLink } from '../types/index';
import { extractWikiLinks, titleToSlug, extractFormulas } from './markdown';
import { supabase } from '../lib/supabase';

// 性能优化：为频繁访问的文章缓存热门文章列表（可选功能）

// 异步更新文章阅读计数
async function updateArticleViewCount (articleId: string): Promise<void> {
  try {
    // 添加类型断言解决supabase RPC调用的类型问题
    await (supabase as unknown as { rpc: (_funcName: string, _params: Record<string, unknown>) => Promise<void> }).rpc('increment_article_views', { 'article_id': articleId });
  } catch (err) {
    console.warn('Failed to update article view count:', err);
  }
}

// 按标题获取文章
async function fetchArticleByTitle (title: string): Promise<Article | null> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('articles')
      .select('*')
      .ilike('title', `%${title}%`)
      .limit(1)
      .single();

    const { 'data': article, error } = result;
    if (error || !article) {
      return null;
    }

    return article as Article;
  } catch (err) {
    console.error('Error in fetchArticleByTitle:', err);
    return null;
  }
}

// 创建文章链接
async function createArticleLink (
  sourceId: string,
  targetId: string,
  type = 'related'
): Promise<ArticleLink | null> {
  try {
    // 检查是否已存在相同的链接
    const result = await supabase.from('article_links')
      .select('*')
      .eq('source_id', sourceId)
      .eq('target_id', targetId)
      .eq('relationship_type', type)
      .maybeSingle();

    // 安全地解构和类型断言
    const { 'data': existingLink, 'error': checkError } = result;

    if (checkError) {
      throw checkError;
    }

    if (existingLink) {
      // 如果已存在，直接返回现有链接
      return existingLink as ArticleLink;
    }

    // 创建新链接
    const createLinkResult = await supabase.from('article_links')
      .insert({
        'source_id': sourceId,
        'target_id': targetId,
        'relationship_type': type
      })
      .select()
      .single();

    // 安全地解构和类型断言
    const { 'data': newLink, 'error': createError } = createLinkResult;

    if (createError) {
      throw createError;
    }

    return newLink as ArticleLink;
  } catch (err) {
    console.error('Error in createArticleLink:', err);
    return null;
  }
}

// 更新文章链接
async function updateArticleLinks (articleId: string, content: string): Promise<void> {
  try {
    // 删除所有源为该文章的旧链接
    await supabase.from('article_links')
      .delete()
      .eq('source_id', articleId);

    // 提取新链接并添加
    const links = extractWikiLinks(content);
    for (const linkedTitle of links) {
      const linkedArticle = await fetchArticleByTitle(linkedTitle);
      if (linkedArticle && linkedArticle.id !== articleId) {
        await createArticleLink(articleId, linkedArticle.id, 'referenced');
      }
    }
  } catch (err) {
    console.error('Error in updateArticleLinks:', err);
    // 更新文章链接失败时，不抛出错误，允许继续操作
  }
}

// 更新文章标签
async function updateArticleTags (articleId: string, tags: string[]): Promise<void> {
  try {
    // 首先删除所有现有标签
    await supabase.from('article_tags').delete()
      .eq('article_id', articleId);

    // 然后添加新标签
    if (tags.length > 0) {
      for (const tagId of tags) {
        await supabase.from('article_tags')
          .insert({
            'article_id': articleId,
            'tag_id': tagId
          });
      }
    }
  } catch (err) {
    console.error('Error in updateArticleTags:', err);
    // 更新文章标签失败时，不抛出错误，允许继续操作
  }
}

// 通用的文章获取函数，提取重复代码
async function fetchArticle<T extends string> (
  key: string,
  value: T,
  cachePrefix: string
): Promise<Article | null> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('articles').select('*')
      .eq(key, value)
      .single();
    const { 'data': article, error } = result;

    if (error || !article) {
      return null;
    }

    // 获取文章的标签
    const tagsResult = await supabase.from('article_tags')
      .select('tag:tag_id(*)')
      .eq('article_id', article.id);

    if (tagsResult?.data && Array.isArray(tagsResult.data)) {
      // 使用unknown作为中间类型进行安全转换
      const dataItems = tagsResult.data as unknown as { tag: unknown }[];
      article.tags = dataItems
        .map(item => item.tag)
        .filter((tag): tag is Tag => tag !== null && typeof tag === 'object');
      article.article_tags = tagsResult.data as unknown as { tag_id: string; article_id: string; added_at: string; tag?: Tag }[];
    } else {
      article.tags = [];
      article.article_tags = [];
    }

    // 更新阅读计数（异步）
    updateArticleViewCount(article.id).catch(console.error);

    return article as Article;
  } catch (err) {
    console.error(`Error in fetchArticle by ${cachePrefix}:`, err);
    // 返回null而不是抛出错误，确保UI能够加载
    return null;
  }
}

// 根据slug获取文章
export async function fetchArticleBySlug (slug: string): Promise<Article | null> {
  return fetchArticle('slug', slug, 'slug');
}

// 根据ID获取文章
export async function fetchArticleById (id: string): Promise<Article | null> {
  return fetchArticle('id', id, 'ID');
}

// 移除冗余的getArticleById函数，直接使用fetchArticleById

// 直接使用真实数据库连接

// 根据标签过滤文章
export async function fetchArticlesByTag (tagId: string): Promise<Article[]> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('article_tags')
      .select('article:article_id(*)')
      .eq('tag_id', tagId);

    // 安全地访问数据
    const articlesWithTags = result?.data || [];
    const articles: Article[] = articlesWithTags
      .filter((item) => item?.article)
      .map((item) => item.article as unknown as Article);

    return articles;
  } catch (err) {
    console.error('Error in fetchArticlesByTag:', err);
    // 返回空数组而不是抛出错误，确保UI能够加载
    return [];
  }
}

// 优化的获取所有文章函数
export async function fetchAllArticles (filterPublic = false, tagId?: string): Promise<Article[]> {
  try {
    if (tagId) {
      // 通过标签过滤文章
      const result = await supabase.from('article_tags')
        .select('article:article_id(*)')
        .eq('tag_id', tagId);

      const articlesWithTags = result?.data || [];
      let articles = articlesWithTags
        .filter((item) => item?.article)
        .map((item) => item.article as unknown as Article);

      // 如果需要过滤公共文章
      if (filterPublic) {
        articles = articles.filter((article: Article) => article.visibility === 'public');
      }

      return articles;
    }
    // 获取所有文章
    let query = supabase.from('articles').select('*');
    if (filterPublic) {
      query = query.eq('visibility', ArticleVisibility.PUBLIC);
    }
    const result = await query;

    return (result?.data || []) as Article[];
  } catch (err) {
    console.error('Error in fetchAllArticles:', err);
    // 返回空数组而不是抛出错误，确保UI能够加载
    return [];
  }
}

// 移除模拟数据相关辅助函数

/**
 * 将文章保存到本地存储作为离线文章
 */
async function saveArticleOffline (article: Partial<Article>): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      const offlineArticles: Partial<Article>[] = JSON.parse(localStorage.getItem('offline_articles') || '[]');

      // 检查是否已存在相同临时ID的文章
      const existingIndex = offlineArticles.findIndex((a) => a.id === article.id);

      const offlineArticle: Partial<Article> = {
        ...(article as Article),
        'is_offline': true,
        'synced': false,
        'last_modified': new Date().toISOString(),
        // 添加默认值，确保所有必需属性都存在
        'view_count': article.view_count || 0,
        'upvotes': article.upvotes || 0,
        'comment_count': article.comment_count || 0
      };

      if (existingIndex >= 0) {
        offlineArticles[existingIndex] = offlineArticle;
      } else {
        offlineArticles.push(offlineArticle);
      }

      localStorage.setItem('offline_articles', JSON.stringify(offlineArticles));
      console.log('文章已保存到本地存储:', article.id);
    }
  } catch (error) {
    console.error('保存离线文章失败:', error);
  }
}

/**
 * 从本地存储中删除离线文章
 */
async function removeOfflineArticle (articleId: string): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      const offlineArticles: Partial<Article>[] = JSON.parse(localStorage.getItem('offline_articles') || '[]');
      const updatedOfflineArticles = offlineArticles.filter((a) => a.id !== articleId);
      localStorage.setItem('offline_articles', JSON.stringify(updatedOfflineArticles));
    }
  } catch (error) {
    console.error('删除离线文章失败:', error);
  }
}

// 优化的创建文章函数 - 支持离线存储和匿名提交
export async function createArticle ({
  title,
  content,
  visibility = ArticleVisibility.PUBLIC,
  authorName,
  authorEmail,
  authorUrl,
  tags
}: {
  title: string;
  content: string;
  visibility?: ArticleVisibility;
  authorName?: string;
  authorEmail?: string;
  authorUrl?: string;
  tags?: string[];
}): Promise<Article | null> {
  // 生成文章slug和临时ID（用于离线存储）
  const slug = titleToSlug(title);
  const tempId = `temp_${Date.now()}_${Math.random().toString(36)
    .substr(2, 9)}`;

  // 创建文章数据对象，包含临时ID
  const articleData = {
    'id': tempId,
    title,
    slug,
    content,
    'author_name': authorName || 'Anonymous',
    'author_email': authorEmail || null,
    'author_url': authorUrl || null,
    visibility,
    'tags': [] as Tag[],
    'article_tags': [] as { tag_id: string; article_id: string; added_at: string; tag?: Tag }[],
    'created_at': new Date().toISOString(),
    'updated_at': new Date().toISOString(),
    'is_offline': true,
    'synced': false,
    'last_modified': new Date().toISOString()
  };

  try {
    // 尝试从数据库获取
    const existingArticleResult = await supabase.from('articles').select('id')
      .eq('slug', slug)
      .maybeSingle();
    const { 'data': existingArticle } = existingArticleResult;

    const finalSlug = existingArticle ? `${slug}-${Date.now().toString(36)
      .substr(2, 9)}` : slug;

    // 创建文章
    const createResult = await supabase.from('articles')
      .insert({
        title,
        'slug': finalSlug,
        content,
        'author_name': authorName || 'Anonymous',
        'author_email': authorEmail,
        'author_url': authorUrl,
        visibility
      })
      .select()
      .single();

    const { 'data': article, 'error': createError } = createResult;

    if (createError || !article) {
      throw new Error('Failed to create article');
    }

    // 如果提供了标签，处理文章标签
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await supabase.from('article_tags')
          .insert({
            'article_id': article.id,
            'tag_id': tagId
          });
      }
    }

    // 处理文章链接
    const links = extractWikiLinks(content);
    for (const linkedTitle of links) {
      const linkedArticle = await fetchArticleByTitle(linkedTitle);
      if (linkedArticle && linkedArticle.id !== article.id) {
        await createArticleLink(article.id, linkedArticle.id, 'referenced');
      }
    }

    // 提取并处理数学公式
    const formulas = extractFormulas(content);
    if (formulas.length > 0) {
      // 这里可以添加公式存储逻辑，目前我们将公式添加到article对象中
      (article as Article & { formulas?: Array<{ id: string; content: string; type: 'inline' | 'block'; label?: string; position: number }> }).formulas = formulas;
    }

    // 从本地存储中删除可能存在的离线文章
    try {
      await removeOfflineArticle(tempId);
    } catch (storageError) {
      console.warn('Failed to remove offline article from local storage:', storageError);
    }

    return article as Article;
  } catch (err) {
    console.error('创建文章时发生网络或数据库错误:', err);

    // 将文章保存到本地存储作为离线文章
    await saveArticleOffline(articleData);

    // 返回带有临时ID的文章
    return articleData as unknown as Article;
  }
}



// 优化的更新文章函数 - 支持离线存储和匿名提交
export async function updateArticle ({
  id,
  title,
  content,
  visibility,
  authorName,
  authorEmail,
  authorUrl,
  tags
}: {
  id: string;
  title: string;
  content: string;
  visibility?: ArticleVisibility;
  authorName?: string;
  authorEmail?: string;
  authorUrl?: string;
  tags?: string[];
}): Promise<Article | null> {
  // 准备更新的数据和检查是否为离线文章
  const now = new Date().toISOString();
  const isOfflineArticle = id.toString().startsWith('temp_');

  // 构建更新对象
  const updateData: Record<string, unknown> = {
    title,
    'slug': titleToSlug(title),
    content,
    'updated_at': now,
    'is_offline': isOfflineArticle,
    'synced': false,
    'last_modified': now
  };

  // 添加可选字段
  if (visibility !== undefined) {
    updateData.visibility = visibility;
  }
  if (authorName !== undefined) {
    updateData.author_name = authorName;
  }
  if (authorEmail !== undefined) {
    updateData.author_email = authorEmail;
  }
  if (authorUrl !== undefined) {
    updateData.author_url = authorUrl;
  }

  try {
    // 如果不是离线文章，尝试更新到数据库
    if (!isOfflineArticle) {
      try {
        // 更新文章
        const result = await supabase.from('articles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        const { 'data': article, 'error': updateError } = result;

        if (updateError || !article) {
          throw new Error('Article not found');
        }

        // 如果提供了标签，更新文章标签
        if (tags !== undefined) {
          await updateArticleTags(id, tags);
        }

        // 处理文章链接更新
        await updateArticleLinks(id, content);

        // 提取并处理数学公式
        const formulas = extractFormulas(content);
        if (formulas.length > 0) {
          // 这里可以添加公式存储逻辑，目前我们将公式添加到article对象中
          (article as Article & { formulas?: Array<{ id: string; content: string; type: 'inline' | 'block'; label?: string; position: number }> }).formulas = formulas;
        }

        // 从本地存储中删除可能存在的离线文章版本
        try {
          await removeOfflineArticle(id);
        } catch (storageError) {
          console.warn('Failed to remove offline article from local storage:', storageError);
        }

        return article as Article;
      } catch (dbError) {
        console.error('更新文章到数据库失败，保存为离线文章:', dbError);

        // 标记为离线文章
        updateData.is_offline = true;

        // 获取现有文章信息（如果有）
        let existingArticle = null;
        try {
          existingArticle = await fetchArticleById(id);
        } catch (fetchError) {
          console.warn('获取现有文章信息失败:', fetchError);
        }

        // 合并更新数据和现有文章信息
        const offlineArticle = existingArticle
          ? { ...existingArticle, ...updateData }
          : { id, ...updateData };

        // 保存到本地存储
        await saveArticleOffline(offlineArticle);

        // 返回离线版本
        return offlineArticle as unknown as Article;
      }
    } else {
      // 对于离线文章，直接更新本地存储
      await saveArticleOffline({ id, ...updateData });

      return { id, ...updateData } as unknown as Article;
    }
  } catch (error) {
    console.error('更新文章时发生错误:', error);

    // 尝试保存到本地存储作为最后的后备方案
    try {
      updateData.is_offline = true;
      await saveArticleOffline({ id, ...updateData });

      // 即使在完全失败的情况下，也返回更新的数据
      return { id, ...updateData } as unknown as Article;
    } catch (storageError) {
      console.error('保存离线文章也失败:', storageError);
      return null;
    }
  }
}

// 优化的删除文章函数
export async function deleteArticle (id: string): Promise<boolean> {
  try {
    // 先删除相关链接
    await supabase.from('article_links')
      .delete()
      .or(`source_id.eq.${id},target_id.eq.${id}`);

    // 再删除文章
    const result = await supabase.from('articles').delete()
      .eq('id', id);
    const { error } = result;

    if (error) {
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteArticle:', err);
    // 返回失败
    return false;
  }
}

// 优化的获取用户文章函数
export async function getUserArticles (userId: string): Promise<Article[]> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('articles')
      .select('*')
      .eq('author_id', userId)
      .order('updated_at', { 'ascending': false });

    const { 'data': articles, error } = result;
    if (error) {
      throw error;
    }

    return (articles || []) as Article[];
  } catch (err) {
    console.error('Error in getUserArticles:', err);
    throw err;
  }
}

// 重新导出这些函数，保持对外接口一致
export { fetchArticleByTitle, createArticleLink, updateArticleLinks };

// 优化的获取文章链接函数
export async function getArticleLinks (articleId: string): Promise<ArticleLink[]> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('article_links')
      .select('*')
      .eq('source_id', articleId);

    // 安全地访问数据
    const links = result?.data || [];
    return links as ArticleLink[];
  } catch (err) {
    console.error('Error in getArticleLinks:', err);
    throw err;
  }
}

// 优化的移除文章所有链接函数
export async function removeAllArticleLinks (articleId: string): Promise<boolean> {
  try {
    // 直接使用supabase客户端
    await supabase.from('article_links')
      .delete()
      .or(`source_id.eq.${articleId},target_id.eq.${articleId}`);

    return true;
  } catch (err) {
    console.error('Error in removeAllArticleLinks:', err);
    throw err;
  }
}

// 优化的保存图表数据函数
export async function saveGraphData (graph: Record<string, unknown>): Promise<string | null> {
  try {
    // 确保graph对象有必要的属性
    const title = graph.title as string || 'Untitled Graph';
    const nodes = graph.nodes as Record<string, unknown>[] || [];
    const links = graph.links as Record<string, unknown>[] || [];
    const userId = graph.userId as string || 'anonymous';
    const isTemplate = graph.isTemplate as boolean || false;

    // 直接使用supabase客户端
    const response = await supabase.from('user_graphs')
      .insert({
        title,
        'graph_data': {
          nodes,
          links
        },
        'user_id': userId,
        'is_template': isTemplate
      })
      .select('id')
      .single();

    const { 'data': savedGraph, error } = response;
    if (error) {
      throw error;
    }

    return savedGraph?.id || null;
  } catch (err) {
    console.error('Error in saveGraphData:', err);
    return null;
  }
}

// 优化的获取用户图表函数
export async function getUserGraphs (authorId: string): Promise<Graph[]> {
  // 安全检查
  if (!authorId || typeof authorId !== 'string') {
    console.warn('Invalid authorId provided to getUserGraphs');
    return [];
  }

  try {
    // 直接使用supabase客户端
    const result = await supabase.from('user_graphs')
      .select('*')
      .eq('author_id', authorId)
      .order('updated_at', { 'ascending': false });

    const { 'data': graphs, error } = result;
    if (error) {
      throw error;
    }

    // 处理返回的数据
    const processedGraphs = (graphs || []).map((graph) => ({
      ...graph,
      'nodes': graph.nodes || [],
      'links': graph.links || []
    }) as Graph);

    return processedGraphs;
  } catch (err) {
    console.error('Error in getUserGraphs:', err);
    // 回退到空数组而不是递归调用
    return [];
  }
}

// 优化的按ID获取图表函数
export async function fetchGraphById (graphId: string): Promise<Graph | null> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('user_graphs')
      .select('*')
      .eq('id', graphId)
      .single();

    // 安全地解构数据
    const { 'data': graph, error } = result;

    if (error || !graph) {
      return null;
    }

    // 处理图表数据
    const processedGraph = {
      ...graph,
      'nodes': graph.graph_data?.nodes || [],
      'links': graph.graph_data?.links || []
    };

    return processedGraph as Graph;
  } catch (err) {
    console.error('Error in fetchGraphById:', err);
    // 回退到null而不是递归调用
    return null;
  }
}

// 优化的删除图表函数
export async function deleteGraph (graphId: string): Promise<boolean> {
  try {
    // 直接使用supabase客户端删除
    const result = await supabase.from('user_graphs').delete()
      .eq('id', graphId);
    const { error } = result;

    if (error) {
      throw error;
    }

    return true;
  } catch (err) {
    console.error('Error in deleteGraph:', err);
    return false;
  }
}

// 获取模板列表
export async function getTemplates (): Promise<Record<string, unknown>[]> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('user_graphs')
      .select('*')
      .eq('is_template', true)
      .eq('visibility', 'public')
      .order('created_at', { 'ascending': false });

    // 安全地解构数据
    const { 'data': templates, error } = result;
    if (error) {
      throw error;
    }

    return templates || [];
  } catch (err) {
    console.error('Error in getTemplates:', err);
    return [];
  }
}

// 获取公共图表列表
export async function getPublicGraphs (limit = 20, offset = 0): Promise<Record<string, unknown>[]> {
  try {
    // 直接使用supabase客户端
    const result = await supabase.from('user_graphs')
      .select('*')
      .eq('visibility', 'public')
      .eq('is_template', false)
      .order('created_at', { 'ascending': false })
      .range(offset, offset + limit - 1);

    // 安全地解构数据
    const { 'data': graphs, error } = result;
    if (error) {
      throw error;
    }

    return graphs || [];
  } catch (err) {
    console.error('Error in getPublicGraphs:', err);
    return [];
  }
}

// 优化的文章搜索函数
export async function searchArticles (
  query: string,
  limit = 10,
  offset = 0
): Promise<Article[]> {
  try {
    // 直接使用supabase客户端
    const searchResult = await supabase.from('articles')
      .select('*')
      .textSearch('title', query, { 'config': 'english' })
      .limit(limit)
      .range(offset, offset + limit - 1)
      .order('updated_at', { 'ascending': false });

    const { 'data': articles, error } = searchResult;
    if (error) {
      throw error;
    }

    return (articles || []) as Article[];
  } catch (err) {
    console.error('Error in searchArticles:', err);
    // 返回空数组，不再使用模拟数据
    return [];
  }
}

// 从知识图表创建文章
export const createArticleFromGraph = async (
  articleTitle: string,
  articleContent: string
): Promise<Article | null> => {
  try {
    // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
    console.log('Using mock data for creating article from graph');

    // 模拟异步延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 直接使用现有createArticle函数创建文章，使用正确的参数顺序
    return await createArticle({
      'title': articleTitle,
      'content': articleContent,
      'visibility': ArticleVisibility.PUBLIC
    });
  } catch (error) {
    console.error('Error creating article from graph:', error);
    return null;
  }
};

// 从文章生成知识图表
// 注意：GraphNode和GraphLink接口已在types/index.ts中定义，此处不再重复定义

export const generateGraphFromArticle = async (
  articleId: string
): Promise<{ nodes: GraphNode[]; links: GraphLink[] } | null> => {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for generating graph from article');

  // 模拟异步延迟
  await new Promise(resolve => setTimeout(resolve, 100));

  // 查找文章
  const article = await fetchArticleById(articleId);
  if (!article) {
    return null;
  }

  // 创建简单的模拟图表数据
  return {
    'nodes': [
      { 'id': articleId,
        'title': article.title,
        'type': 'article',
        'slug': article.slug,
        'connections': 0
      } as GraphNode
    ],
    'links': [] as GraphLink[]
  };
};
