/**
 * 创建主题页面组件
 * 允许用户创建新的讨论主题
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { DiscussionCategory, DiscussionTopic } from '../types';
import { discussionService } from '../services/discussionService';
/**
 * 创建主题页面组件
 */
export function CreateTopicPage () {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();

  const [category, setCategory] = useState<DiscussionCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  /**
   * 加载分类信息
   */
  const loadCategory = useCallback(async () => {
    try {
      const categories = await discussionService.getCategories();
      const foundCategory = categories.find(cat => cat.slug === categorySlug);

      if (!foundCategory) {
        navigate('/discussions');
        return;
      }

      setCategory(foundCategory);
    } catch (error) {
      console.error('Failed to load category:', error);
      navigate('/discussions');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlug, navigate, setCategory, setIsLoading]);

  /**
   * 处理主题提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !authorName.trim() || !category) {
      return;
    }

    try {
      setIsSubmitting(true);

      // 构建主题数据，只在有值时包含author_email
      const topicData: Omit<DiscussionTopic, 'id' | 'reply_count' | 'view_count' | 'is_pinned' | 'created_at' | 'updated_at'> = {
        title,
        content,
        'author_name': authorName,
        'category_id': category.id
      };

      if (authorEmail) {
        topicData.author_email = authorEmail;
      }

      const newTopic = await discussionService.createTopic(topicData);

      if (newTopic) {
        navigate(`/discussions/${category.slug}/${newTopic.id}`);
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    loadCategory();
  }, [categorySlug, navigate, loadCategory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">分类未找到</h2>
          <Link to="/discussions" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            返回讨论区
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 返回按钮 */}
        <div className="mb-6">
          <Link
            to={`/discussions/${categorySlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回{category.name}讨论区
          </Link>
        </div>

        {/* 页面标题 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8">创建新主题</h1>

        {/* 创建表单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">主题标题</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg px-4 py-2"
                placeholder="输入主题标题"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">主题内容 (支持Markdown)</label>              <div className="border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                <MDEditor
                  value={content}
                  onChange={(value) => setContent(value || '')}
                  height={400}
                  className="min-h-[400px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="author-name" className="block text-sm font-medium text-gray-700 mb-1">您的姓名</label>
                <input
                  type="text"
                  id="author-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
                  placeholder="输入您的姓名"
                />
              </div>
              <div>
                <label htmlFor="author-email" className="block text-sm font-medium text-gray-700 mb-1">邮箱 (可选)</label>
                <input
                  type="email"
                  id="author-email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
                  placeholder="输入您的邮箱"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link
                to={`/discussions/${categorySlug}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                创建主题
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
