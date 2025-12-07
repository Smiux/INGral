/**
 * 创建主题页面组件
 * 允许用户创建新的讨论主题
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Tag, Image } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { DiscussionCategory, DiscussionTopic } from '../types';
import { discussionService } from '../services/discussionService';
import { fileService } from '../services/fileService';

/**
 * 创建主题页面组件
 */
export function CreateTopicPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState<DiscussionCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [availableTags, setAvailableTags] = useState<{ id: number; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  // 图片上传相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

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
   * 加载标签
   */
  const loadTags = useCallback(async () => {
    try {
      const data = await discussionService.getTags();
      setAvailableTags(data.map(tag => ({ id: tag.id, name: tag.name })));
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }, [setAvailableTags]);

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
   * 处理图片上传按钮点击
   */
  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * 处理图片上传
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    try {
      setIsUploading(true);
      
      // 上传图片到Supabase存储
      const imageUrl = await fileService.uploadFile(file, 'images', 'discussions');
      
      if (imageUrl) {
        // 将图片Markdown语法插入到编辑器内容中
        const imageMarkdown = `![Image](${imageUrl})\n\n`;
        setContent(prev => prev + imageMarkdown);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
        author_name: authorName,
        category_id: category.id
      };
      
      if (authorEmail) {
        topicData.author_email = authorEmail;
      }
      
      const newTopic = await discussionService.createTopic(topicData, selectedTags);
      
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
    loadTags();
  }, [categorySlug, navigate, loadCategory, loadTags]);

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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h2>
          <Link to="/discussions" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Discussions
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
            Back to {category.name} Discussions
          </Link>
        </div>

        {/* 页面标题 */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Create New Topic</h1>

        {/* 创建表单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Topic Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg px-4 py-2"
                placeholder="Enter topic title"
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Topic Content (Markdown supported)</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={handleImageButtonClick}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed text-sm"
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Image className="w-4 h-4" />
                  )}
                  Upload Image
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div className="border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
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
                <label htmlFor="author-name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  id="author-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label htmlFor="author-email" className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  id="author-email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Tags (Optional)</label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedTags.includes(tag.id)
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link
                to={`/discussions/${categorySlug}`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
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
                Create Topic
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
