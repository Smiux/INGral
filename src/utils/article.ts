import { Graph, Article, ArticleLink, GraphLink } from '@/types';
import { extractWikiLinks, titleToSlug } from './markdown';

// 模拟数据 - 保留模拟数据以确保应用能够继续运行
let mockArticles: Article[] = [
  {
    id: '1',
    title: 'React 基础教程',
    slug: 'react-basics',
    content: '# React 基础教程\n\nReact 是一个用于构建用户界面的 JavaScript 库。\n\n## 核心概念\n\n- 组件\n- JSX\n- 状态管理\n- 生命周期',
    author_id: 'user1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    view_count: 100,
    visibility: 'public',
    allow_contributions: true
  },
  {
    id: '2',
    title: 'TypeScript 类型系统',
    slug: 'typescript-types',
    content: '# TypeScript 类型系统\n\nTypeScript 提供了强大的类型系统。\n\n## 基本类型\n\n- number\n- string\n- boolean\n- array\n- object',
    author_id: 'user2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    view_count: 50,
    visibility: 'public',
    allow_contributions: true
  },
  {
    id: '3',
    title: '前端性能优化',
    slug: 'frontend-performance',
    content: '# 前端性能优化\n\n性能优化是前端开发的重要部分。\n\n## 优化策略\n\n- 代码分割\n- 懒加载\n- 缓存策略\n- 图片优化',
    author_id: 'user3',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    view_count: 75,
    visibility: 'public',
    allow_contributions: true
  }
];

let mockArticleLinks: ArticleLink[] = [
  {
    id: '1',
    source_id: '1',
    target_id: '2',
    relationship_type: 'related',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    source_id: '1',
    target_id: '3',
    relationship_type: 'related',
    created_at: '2024-01-01T00:00:00Z'
  }
];

// 数据库连接状态被移除 - 由于将通过其他方式连接到真实数据库

export async function fetchArticleBySlug(slug: string): Promise<Article | null> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  const mockArticle = mockArticles.find(article => article.slug === slug);
  if (mockArticle) {
    // 模拟增加阅读计数
    mockArticle.view_count += 1;
    console.log('Using mock data for article:', slug);
    return mockArticle;
  }

  return null;
}

// 添加按ID获取文章的函数
export async function fetchArticleById(id: string): Promise<Article | null> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  const mockArticle = mockArticles.find(article => article.id === id);
  if (mockArticle) {
    mockArticle.view_count += 1;
    console.log('Using mock data for article ID:', id);
    return mockArticle;
  }

  return null;
}

export async function fetchAllArticles(filterPublic: boolean = false): Promise<Article[]> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for all articles');
  const articles = [...mockArticles].sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  
  // 如果需要过滤公开文章
  if (filterPublic) {
    return articles.filter(article => article.visibility === 'public');
  }
  
  return articles;
}

export async function createArticle(
  title: string,
  content: string,
  userId: string,
  visibility: 'public' | 'community' | 'private' = 'public',
  allowContributions: boolean = false
): Promise<Article | null> {
  // 模拟创建文章 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for article creation');
  const slug = titleToSlug(title);
  const newMockArticle: Article = {
    id: `mock-article-${Date.now()}`,
    title,
    slug,
    content,
    author_id: userId,
    view_count: 0,
    visibility: visibility,
    allow_contributions: allowContributions,
    upvotes: 0,
    comment_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  mockArticles.push(newMockArticle);
  
  // 处理文章链接
  const links = extractWikiLinks(content);
  for (const linkedTitle of links) {
    const linkedArticle = await fetchArticleByTitle(linkedTitle);
    if (linkedArticle && linkedArticle.id !== newMockArticle.id) {
      await createArticleLink(newMockArticle.id, linkedArticle.id, 'referenced');
    }
  }
  
  return newMockArticle;
}

export async function updateArticle(
  id: string,
  title: string,
  content: string,
  visibility?: 'public' | 'community' | 'private',
  allowContributions?: boolean
): Promise<Article | null> {
  // 使用模拟数据更新文章 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for article update');
  
  const articleIndex = mockArticles.findIndex(article => article.id === id);
  
  if (articleIndex === -1) {
    return null;
  }
  
  const updatedArticle = {
    ...mockArticles[articleIndex],
    title,
    slug: titleToSlug(title),
    content,
    updated_at: new Date().toISOString()
  };
  
  // 添加可选字段
  if (visibility !== undefined) updatedArticle.visibility = visibility;
  if (allowContributions !== undefined) updatedArticle.allow_contributions = allowContributions;
  
  mockArticles[articleIndex] = updatedArticle;
  
  // 处理文章链接更新
  await updateArticleLinks(id, content);
  
  return updatedArticle;
}

export async function deleteArticle(id: string): Promise<boolean> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for article deletion');
  
  // 过滤掉要删除的文章
  mockArticles = mockArticles.filter(article => article.id !== id);
  
  // 过滤掉与删除文章相关的链接
  mockArticleLinks = mockArticleLinks.filter(link => link.source_id !== id && link.target_id !== id);
  
  return true;
}

export async function fetchArticleByTitle(title: string): Promise<Article | null> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for fetching article by title');
  
  // 模拟异步查询
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const normalizedTitle = title.toLowerCase().trim();
  const foundArticle = mockArticles.find(
    article => article.title.toLowerCase().includes(normalizedTitle)
  );
  
  if (foundArticle) {
    return foundArticle;
  }
  
  return null;
}

// 获取用户自己的所有文章
export async function getUserArticles(userId: string): Promise<Article[]> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for user articles:', userId);
  return mockArticles
    .filter(article => article.author_id === userId)
    .sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
}

export async function createArticleLink(
  sourceId: string,
  targetId: string,
  type: string = 'related'
): Promise<ArticleLink | null> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for article link creation');
  const mockLink: ArticleLink = {
    id: `mock-link-${Date.now()}`,
    source_id: sourceId,
    target_id: targetId,
    relationship_type: type,
    created_at: new Date().toISOString()
  };
  mockArticleLinks.push(mockLink);
  return mockLink;
}

export async function updateArticleLinks(articleId: string, content: string): Promise<void> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Mock: Updating article links for', articleId);
  
  // 模拟删除旧链接
  const oldLinks = mockArticleLinks.filter(link => link.source_id === articleId);
  oldLinks.forEach(link => {
    const index = mockArticleLinks.indexOf(link);
    if (index > -1) mockArticleLinks.splice(index, 1);
  });

  // 模拟创建新链接
  const links = extractWikiLinks(content);
  for (const linkedTitle of links) {
    const linkedArticle = await fetchArticleByTitle(linkedTitle);
    if (linkedArticle && linkedArticle.id !== articleId) {
      await createArticleLink(articleId, linkedArticle.id, 'referenced');
    }
  }
}

// 新增函数：移除文章的所有链接
  export async function removeAllArticleLinks(articleId: string): Promise<boolean> {
    // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
    console.log('Using mock data for removing all article links');
    
    // 过滤掉与文章相关的所有链接
    mockArticleLinks = mockArticleLinks.filter(
      link => link.source_id !== articleId && link.target_id !== articleId
    );
    
    return true;
  }
  
  export async function fetchGraphData(): Promise<{
  nodes: Array<{id: string, title: string, type?: string, connections: number, description?: string, color?: string, size?: number, slug?: string}>;
  links: GraphLink[];
}> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock graph data');
  
  // 使用现有的模拟文章创建节点
  const nodesWithSlugs = mockArticles.map(article => ({
    id: article.id,
    title: article.title,
    type: 'article',
    connections: 0,
    slug: article.slug,
    color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
    size: 20 + Math.random() * 10
  }));
  
  // 计算连接数
  const connectionCounts = new Map<string, number>();
  mockArticleLinks.forEach(link => {
    connectionCounts.set(link.source_id, (connectionCounts.get(link.source_id) || 0) + 1);
    connectionCounts.set(link.target_id, (connectionCounts.get(link.target_id) || 0) + 1);
  });
  
  // 更新节点连接数
  nodesWithSlugs.forEach(node => {
    node.connections = connectionCounts.get(node.id) || 0;
  });
  
  // 创建GraphLink类型的链接
  const links: GraphLink[] = mockArticleLinks.map(link => ({
    source: link.source_id,
    target: link.target_id,
    type: link.relationship_type,
    label: link.relationship_type,
    weight: 1,
    color: '#666'
  }));
  
  // 如果没有足够的链接，添加一些额外的模拟链接
  if (links.length < 3) {
    const additionalLinks = [
      { source: nodesWithSlugs[0].id, target: nodesWithSlugs[1].id, type: 'related', label: 'related' },
      { source: nodesWithSlugs[0].id, target: nodesWithSlugs[2].id, type: 'related', label: 'related' }
    ];
    links.push(...additionalLinks as GraphLink[]);
  }
  
  return { nodes: nodesWithSlugs, links };
}

// 保存用户创建的知识图表
export async function saveGraphData(_userId: string, _graphName: string, _nodes: Array<{id: string, title: string, is_custom?: boolean, x?: number, y?: number, content?: string, created_by?: string, connections: number}>, _links: Array<{source: string | {id: string}, target: string | {id: string}, type: string, id: string}>): Promise<boolean> {
      // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
    console.log('Using mock data for saving graph');
    
    // 由于是模拟实现，我们跳过实际的节点过滤和链接过滤逻辑
  
  // 模拟保存成功
  return true;
}

// 获取用户创建的所有图表
export async function getUserGraphs(userId: string): Promise<Array<{id: string, user_id: string, name: string, nodes: Array<{id: string, title: string, connections: number}>, links: Array<{source: string, target: string, type: string}>, is_template: boolean, created_at: string, updated_at: string}>> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for user graphs');
  
  // 安全检查
  if (!userId || typeof userId !== 'string') {
    console.warn('Invalid userId provided to getUserGraphs');
    return [];
  }
  
  // 直接返回模拟用户图表数据
  return getMockUserGraphs(userId);
}

// 获取图表模板
export async function getGraphTemplates(): Promise<Array<{id: string, user_id: string, name: string, nodes: Array<{id: string, title: string, connections: number}>, links: Array<{source: string, target: string, type: string}>, is_template: boolean, created_at: string, updated_at: string}>> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for graph templates');
  
  // 返回模拟模板数据
  return getMockGraphTemplates();
}

// 模拟用户图表数据
function getMockUserGraphs(userId: string) {
  return [
    {
      id: 'mock-graph-1',
      user_id: userId,
      name: '我的知识网络',
      nodes: [
        { id: 'node-1', title: 'React 入门', connections: 2 },
        { id: 'node-2', title: 'TypeScript', connections: 2 },
        { id: 'node-3', title: '前端开发', connections: 2 }
      ],
      links: [
        { source: 'node-1', target: 'node-2', type: 'related' },
        { source: 'node-2', target: 'node-3', type: 'related' }
      ],
      is_template: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'mock-graph-2',
      user_id: userId,
      name: '项目规划',
      nodes: [
        { id: 'node-4', title: '需求分析', connections: 1 },
        { id: 'node-5', title: '技术选型', connections: 1 }
      ],
      links: [
        { source: 'node-4', target: 'node-5', type: 'follows' }
      ],
      is_template: false,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];
}

// 根据ID获取模拟图表数据
function getMockGraphById(graphId: string) {
  const mockGraphs = [
    ...getMockUserGraphs('mock-user'),
    ...getMockGraphTemplates()
  ];
  
  return mockGraphs.find(graph => graph.id === graphId) || {
    id: graphId,
    user_id: 'mock-user',
    name: '示例图表',
    nodes: [
      { id: 'default-node-1', title: '节点1', connections: 1 },
      { id: 'default-node-2', title: '节点2', connections: 1 }
    ],
    links: [
      { source: 'default-node-1', target: 'default-node-2', type: 'related' }
    ],
    is_template: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// 模拟图表模板数据
function getMockGraphTemplates() {
  return [
    {
      id: 'template-1',
      user_id: 'system',
      name: '基础概念图',
      nodes: [
        { id: 't-node-1', title: '核心概念', connections: 2 },
        { id: 't-node-2', title: '相关知识', connections: 1 },
        { id: 't-node-3', title: '实践应用', connections: 1 }
      ],
      links: [
        { source: 't-node-1', target: 't-node-2', type: 'related' },
        { source: 't-node-1', target: 't-node-3', type: 'leads_to' }
      ],
      is_template: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'template-2',
      user_id: 'system',
      name: '项目流程图',
      nodes: [
        { id: 't-node-4', title: '开始', connections: 1 },
        { id: 't-node-5', title: '进行中', connections: 1 },
        { id: 't-node-6', title: '结束', connections: 0 }
      ],
      links: [
        { source: 't-node-4', target: 't-node-5', type: 'follows' },
        { source: 't-node-5', target: 't-node-6', type: 'follows' }
      ],
      is_template: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
}

// 根据ID获取图表
export async function fetchGraphById(graphId: string): Promise<Graph | null> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for graph by ID');
  
  // 返回模拟图表数据
  return getMockGraphById(graphId);
}

// 删除图表
export async function deleteGraph(_graphId: string, _userId: string): Promise<boolean> {
    // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for graph deletion');
  
  // 模拟删除成功
  return true;
}

export async function searchArticles(
  query: string,
  limit: number = 10,
  offset: number = 0
): Promise<Article[]> {
  // 使用模拟数据 - 由于将通过其他方式连接到真实数据库，这里只保留模拟数据功能
  console.log('Using mock data for searching articles');
  
  // 模拟异步延迟
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // 简单的模拟搜索实现 - 实际项目中可能需要更复杂的搜索逻辑
  const normalizedQuery = query.toLowerCase();
  const filteredArticles = mockArticles.filter(article =>
    article.title.toLowerCase().includes(normalizedQuery) ||
    article.content.toLowerCase().includes(normalizedQuery)
  );
  
  // 按创建时间排序并应用分页
  const sortedArticles = [...filteredArticles].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  return sortedArticles.slice(offset, offset + limit);
}
