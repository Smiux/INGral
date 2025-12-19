/**
 * 文章列表页面
 * 展示所有文章，支持搜索功能和标签过滤
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import type { Article, Tag } from '../types';
import { fetchAllArticles } from '../utils/article';
import { TagCloud } from '../components/tags';
import { tagService } from '../services/tagService';

export function ArticlesPage () {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  /**
   * 加载文章列表
   */
  useEffect(() => {
    const loadArticles = async () => {
      try {
        // 只获取公开文章
        const data = await fetchAllArticles(true);
        setArticles(data);
      } catch (error) {
        console.error('Failed to load articles:', error);
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadArticles();
  }, []);

  /**
   * 加载标签列表
   */
  useEffect(() => {
    const loadTags = async () => {
      try {
        const data = await tagService.getPopularTags(20);
        setTags(data);
      } catch (error) {
        console.error('Failed to load tags:', error);
        setTags([]);
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, []);

  /**
   * 根据搜索查询和标签过滤文章
   */
  const filteredArticles = articles.filter((article) => {
    // 标题搜索过滤
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());

    // 标签过滤
    const matchesTag = !selectedTag || article.tags?.some(tag => tag.id === selectedTag.id);

    return matchesSearch && matchesTag;
  });

  /**
   * 处理标签点击
   */
  const handleTagClick = (tag: Tag) => {
    setSelectedTag(tag);
  };

  /**
   * 清除选中的标签
   */
  const clearSelectedTag = () => {
    setSelectedTag(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">All Articles</h1>
        <Link
          to="/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Article
        </Link>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* 标签云 */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">热门标签</h2>
        {isLoadingTags ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <TagCloud
            tags={tags}
            selectedTagId={selectedTag?.id}
            onTagClick={handleTagClick}
            maxTags={20}
          />
        )}
      </div>

      {/* 选中的标签 */}
      {selectedTag && (
        <div className="flex items-center gap-2 mb-8 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-800">
            已选择标签: <span className="font-semibold">{selectedTag.name}</span>
          </span>
          <button
            onClick={clearSelectedTag}
            className="flex items-center justify-center w-5 h-5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition"
            aria-label="清除选中的标签"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 有文章时显示列表 */}
      {!isLoading && filteredArticles.length > 0 && (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-lg hover:border-blue-300 transition group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition mb-2">
                    {article.title}
                  </h2>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {article.content.substring(0, 150)}...
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                    <span>{article.view_count} views</span>
                    <span>
                      Updated{
                        article.updated_at ? new Date(article.updated_at).toLocaleDateString('en-US', {
                          'month': 'short',
                          'day': 'numeric',
                          'year': article.updated_at && new Date(article.updated_at).getFullYear() !== new Date().getFullYear()
                            ? 'numeric'
                            : undefined
                        }) : 'N/A'
                      }
                    </span>
                  </div>

                  {/* 文章标签 */}
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.slice(0, 3).map(tag => (
                        <button
                          key={tag.id}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleTagClick(tag);
                          }}
                          className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          style={{
                            'backgroundColor': `${tag.color}10`,
                            'color': tag.color,
                            'border': `1px solid ${tag.color}30`
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                      {article.tags.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{article.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 无文章时显示空状态 */}
      {!isLoading && filteredArticles.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">
            {searchQuery ? 'No articles match your search.' : 'No articles yet.'}
          </p>
          {!searchQuery && (
            <Link
              to="/create"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Create Article
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
