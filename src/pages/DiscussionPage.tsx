/**
 * 讨论主页面组件
 * 展示讨论分类和主题列表
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Tag, MessageSquare, Eye, Clock, Users } from 'lucide-react';
import type { DiscussionCategory, DiscussionTopic } from '../types';
import { discussionService } from '../services/discussionService';

/**
 * 讨论主页面组件
 */
export function DiscussionPage() {
  const [categories, setCategories] = useState<DiscussionCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('academic');
  const [topics, setTopics] = useState<DiscussionTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'time' | 'random'>('time');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [availableTags, setAvailableTags] = useState<{ id: number; name: string }[]>([]);
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalTopics, setTotalTopics] = useState(0);
  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * 加载讨论分类
   */
  const loadCategories = async () => {
    try {
      const data = await discussionService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  /**
   * 加载标签
   */
  const loadTags = async () => {
    try {
      const data = await discussionService.getTags();
      setAvailableTags(data.map(tag => ({ id: tag.id, name: tag.name })));
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  /**
   * 加载主题列表
   */
  const loadTopics = async () => {
    try {
      setIsLoading(true);
      const category = categories.find(cat => cat.slug === selectedCategory);
      if (category) {
        // 计算偏移量
        const offset = (currentPage - 1) * pageSize;
        
        const { data, count } = await discussionService.getTopicsByCategory(
          category.id,
          pageSize,
          offset,
          sortBy,
          selectedTags,
          searchQuery
        );
        
        setTopics(data);
        if (count !== undefined) {
          setTotalTopics(count);
        }
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 处理分类切换
   */
  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
  };

  /**
   * 处理标签切换
   */
  const handleTagToggle = (tagId: number) => {
    setSelectedTags(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    loadCategories();
    loadTags();
  }, []);

  /**
   * 当分类、排序方式、标签或搜索查询变化时重新加载主题
   */
  useEffect(() => {
    // 重置到第一页
    setCurrentPage(1);
    loadTopics();
  }, [selectedCategory, sortBy, selectedTags, categories, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Discussions</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左侧分类导航 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
              </div>
              <nav className="p-2">
                {categories.map(category => (
                  <Link
                    key={category.id}
                    to={`/discussions/${category.slug}`}
                    onClick={() => handleCategoryChange(category.slug)}
                    className={`block px-3 py-2 rounded-md text-sm font-medium ${selectedCategory === category.slug
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    {category.name}
                  </Link>
                ))}
              </nav>

              {/* 标签过滤 */}
              <div className="p-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.slice(0, 10).map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${selectedTags.includes(tag.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } transition-colors`}
                    >
                      <Tag className="w-3 h-3" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧主题列表 */}
          <div className="lg:col-span-3">
            {/* 工具栏 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {categories.find(cat => cat.slug === selectedCategory)?.name} Discussions
                  </h2>
                  <span className="text-sm text-gray-500">({topics.length} topics)</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                  {/* 搜索输入框 */}
                  <div className="w-full sm:w-64">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="sort" className="text-sm font-medium text-gray-700">Sort by:</label>
                    <select
                      id="sort"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'time' | 'random')}
                      className="text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="time">Most Recent</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                  <Link
                    to={`/discussions/${selectedCategory}/create`}
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    <MessageSquare className="w-4 h-4" />
                    New Topic
                  </Link>
                </div>
              </div>
            </div>

            {/* 主题列表 */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            ) : topics.length > 0 ? (
              <div className="space-y-4">
                {topics.map(topic => (
                  <Link
                    key={topic.id}
                    to={`/discussions/${selectedCategory}/${topic.id}`}
                    className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:border-indigo-200 transition-colors"
                  >
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                          {topic.is_pinned && <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium bg-yellow-100 px-2 py-0.5 rounded-full mr-2">Pinned</span>}
                          {topic.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{topic.reply_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{topic.view_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(topic.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-gray-600 text-sm line-clamp-2 mb-3">
                        {topic.content.replace(/(<([^>]+)>)/gi, '')}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">{topic.author_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                          <span>Read more</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                
                {/* 分页控件 */}
                <div className="flex justify-center mt-8">
                  <nav className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white border border-gray-300 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.ceil(totalTopics / pageSize) }, (_, i) => i + 1).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalTopics / pageSize)))}
                      disabled={currentPage === Math.ceil(totalTopics / pageSize)}
                      className="px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white border border-gray-300 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No topics yet</h3>
                <p className="text-gray-500 mb-6">Be the first to start a discussion in this category</p>
                <Link
                  to={`/discussions/${selectedCategory}/create`}
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start New Topic
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
