/**
 * 主题详情页面组件
 * 展示单个讨论主题和其回复
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Users, Eye, Clock, ArrowLeft, Send, Tag, Image } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { DiscussionTopic, DiscussionReply, DiscussionCategory } from '../types';
import { discussionService } from '../services/discussionService';
import { fileService } from '../services/fileService';

/**
 * 主题详情页面组件
 */
export function TopicDetailPage() {
  const { categorySlug, topicId } = useParams<{ categorySlug: string; topicId: string }>();
  const navigate = useNavigate();
  
  const [topic, setTopic] = useState<DiscussionTopic | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [category, setCategory] = useState<DiscussionCategory | null>(null);
  // 回复分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalReplies, setTotalReplies] = useState(0);
  // 图片上传相关
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * 加载主题详情
   */
  const loadTopic = useCallback(async () => {
    try {
      setIsLoading(true);
      const numericTopicId = parseInt(topicId || '', 10);
      if (isNaN(numericTopicId)) {
        navigate('/discussions');
        return;
      }
      
      const data = await discussionService.getTopicById(numericTopicId);
      if (!data) {
        navigate('/discussions');
        return;
      }
      
      setTopic(data);
      
      // 加载分类信息
      const categoryData = await discussionService.getCategories();
      const foundCategory = categoryData.find(cat => cat.id === data.category_id);
      setCategory(foundCategory || null);
    } catch (error) {
      console.error('Failed to load topic:', error);
      navigate('/discussions');
    }
  }, [topicId, navigate, setTopic, setCategory, setIsLoading]);

  /**
   * 加载回复
   */
  const loadReplies = useCallback(async () => {
    try {
      const numericTopicId = parseInt(topicId || '', 10);
      if (isNaN(numericTopicId)) return;
      
      // 计算偏移量
      const offset = (currentPage - 1) * pageSize;
      
      const { data, count } = await discussionService.getTopicReplies(numericTopicId, pageSize, offset);
      setReplies(data);
      if (count !== undefined) {
        setTotalReplies(count);
      }
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  }, [topicId, currentPage, pageSize, setReplies, setTotalReplies]);

  /**
   * 处理回复提交
   */
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyContent.trim() || !authorName.trim() || !topic) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const numericTopicId = parseInt(topicId || '', 10);
      
      const replyData: Omit<DiscussionReply, 'id' | 'created_at' | 'replies'> = {
        topic_id: numericTopicId,
        content: replyContent,
        author_name: authorName
      };
      
      if (authorEmail) {
        replyData.author_email = authorEmail;
      }
      
      await discussionService.createReply(replyData);
      
      // 重置表单
      setReplyContent('');
      setAuthorEmail('');
      
      // 重新加载回复
      await loadReplies();
    } catch (error) {
      console.error('Failed to submit reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理子回复
   */
  const handleReplyToReply = (parentId: number) => {
    // 可以添加子回复功能
    console.log('Reply to reply:', parentId);
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
        setReplyContent(prev => prev + imageMarkdown);
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
   * 初始化数据加载
   */
  useEffect(() => {
    loadTopic();
    loadReplies();
  }, [topicId, navigate, loadTopic, loadReplies]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!topic || !category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Topic Not Found</h2>
          <Link to={`/discussions/${categorySlug}`} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
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
        {/* 导航面包屑 */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/discussions" className="hover:text-indigo-600 transition-colors">Discussions</Link>
          <span>/</span>
          <Link to={`/discussions/${categorySlug}`} className="hover:text-indigo-600 transition-colors">{category.name}</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{topic.title}</span>
        </div>

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

        {/* 主题内容 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          {/* 主题标题栏 */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {topic.is_pinned && <span className="inline-flex items-center gap-1 text-yellow-600 text-xs font-medium bg-yellow-100 px-2 py-0.5 rounded-full mr-2">Pinned</span>}
                {topic.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{topic.author_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(topic.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{topic.reply_count} replies</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{topic.view_count} views</span>
                </div>
              </div>
            </div>
          </div>

          {/* 主题标签 */}
          {topic.tags && topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {topic.tags.map(tag => (
                <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                  <Tag className="w-3 h-3" />
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {/* 主题内容 */}
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-6">
            {topic.content}
          </div>
        </div>

        {/* 回复表单 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Reply</h2>
          <form onSubmit={handleReplySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="author-name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  id="author-name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  required
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <div>
              <label htmlFor="reply-content" className="block text-sm font-medium text-gray-700 mb-1">Your Reply (Markdown supported)</label>
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
                  value={replyContent}
                  onChange={(value) => setReplyContent(value || '')}
                  height={300}
                  className="min-h-[300px]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Submit Reply
              </button>
            </div>
          </form>
        </div>

        {/* 回复列表 */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Replies ({topic.reply_count})</h2>
          
          {replies.length > 0 ? (
            <div className="space-y-4">
              {replies.map(reply => (
                <div key={reply.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{reply.author_name}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(reply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleReplyToReply(reply.id)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Reply
                    </button>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {reply.content}
                  </div>
                  {/* 嵌套回复 */}
                  {reply.replies && reply.replies.length > 0 && (
                    <div className="ml-8 mt-4 space-y-4">
                      {reply.replies.map(nestedReply => (
                        <div key={nestedReply.id} className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="font-medium text-gray-900">{nestedReply.author_name}</span>
                              <span className="text-sm text-gray-500">
                                {new Date(nestedReply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <button
                              onClick={() => handleReplyToReply(nestedReply.id)}
                              className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              Reply
                            </button>
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap">
                            {nestedReply.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* 回复分页控件 */}
              <div className="flex justify-center mt-8">
                <nav className="inline-flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white border border-gray-300 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.ceil(totalReplies / pageSize) }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalReplies / pageSize)))}
                    disabled={currentPage === Math.ceil(totalReplies / pageSize)}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No replies yet</h3>
              <p className="text-gray-500">Be the first to reply to this topic</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
