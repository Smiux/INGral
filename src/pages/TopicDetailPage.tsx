/**
 * 主题详情页面
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ThumbsUp } from 'lucide-react';
import type { DiscussionTopic, DiscussionReply } from '../types';
import { discussionService } from '../services/discussionService';

interface ReplyFormData {
  authorName: string;
  authorEmail: string;
  content: string;
}

interface EditReplyFormData {
  content: string;
}

interface TopicDetailPageProps {
  topicId: number;
}

export function TopicDetailPage ({ topicId }: TopicDetailPageProps) {
  const [topic, setTopic] = useState<DiscussionTopic | null>(null);
  const [replies, setReplies] = useState<DiscussionReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyFormData, setReplyFormData] = useState<ReplyFormData>({
    'authorName': '',
    'authorEmail': '',
    'content': ''
  });
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyFormData, setEditReplyFormData] = useState<EditReplyFormData>({
    'content': ''
  });

  /**
   * 加载主题详情和回复
   */
  useEffect(() => {
    const loadTopicAndReplies = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 加载主题详情
        const topicData = await discussionService.getTopicById(topicId);
        if (!topicData) {
          throw new Error('Topic not found');
        }
        setTopic(topicData);

        // 加载回复
        const { 'data': repliesData } = await discussionService.getTopicReplies(topicId);
        setReplies(repliesData);
      } catch (err) {
        setError('Failed to load topic details');
        console.error('Error loading topic and replies:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTopicAndReplies();
  }, [topicId]);

  /**
   * 处理回复提交
   */
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 验证表单
      if (!replyFormData.authorName.trim() || !replyFormData.content.trim()) {
        throw new Error('Please fill in all required fields');
      }

      // 提交回复
      const newReply = await discussionService.createReply({
        'topic_id': topicId,
        'content': replyFormData.content,
        'author_name': replyFormData.authorName,
        'author_email': replyFormData.authorEmail
      });

      // 更新回复列表
      if (newReply) {
        setReplies([...replies, newReply]);
      }

      // 清空表单
      setReplyFormData({
        'authorName': '',
        'authorEmail': '',
        'content': ''
      });
    } catch (err) {
      setError('Failed to submit reply');
      console.error('Error submitting reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 处理回复输入变化
   */
  const handleReplyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReplyFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * 处理回复编辑输入变化
   */
  const handleEditReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditReplyFormData({
      'content': e.target.value
    });
  };

  /**
   * 处理回复点赞
   */
  const handleReplyUpvote = async (replyId: number) => {
    try {
      // 实际项目中，这里应该调用API来更新点赞数
      // 现在只是模拟更新
      setReplies(prevReplies => prevReplies.map(reply => {
        if (reply.id === replyId) {
          return {
            ...reply
          };
        }
        return reply;
      }));
    } catch (err) {
      console.error('Error upvoting reply:', err);
    }
  };

  /**
   * 处理开始编辑回复
   */
  const handleStartEditReply = (reply: DiscussionReply) => {
    setEditingReplyId(reply.id);
    setEditReplyFormData({
      'content': reply.content
    });
  };

  /**
   * 处理取消编辑回复
   */
  const handleCancelEditReply = () => {
    setEditingReplyId(null);
    setEditReplyFormData({ 'content': '' });
  };

  /**
   * 处理保存编辑后的回复
   */
  const handleSaveEditReply = async () => {
    if (!editingReplyId || !editReplyFormData.content.trim()) {
      return;
    }

    try {
      // 模拟更新回复
      setReplies(prevReplies => prevReplies.map(reply => {
        if (reply.id === editingReplyId) {
          return {
            ...reply,
            'content': editReplyFormData.content
          };
        }
        return reply;
      }));

      // 退出编辑模式
      setEditingReplyId(null);
      setEditReplyFormData({ 'content': '' });
    } catch (err) {
      setError('Failed to update reply');
      console.error('Error updating reply:', err);
    }
  };

  /**
   * 处理删除回复
   */
  const handleDeleteReply = async (replyId: number) => {
    try {
      // 模拟删除回复
      setReplies(prevReplies => prevReplies.filter(reply => reply.id !== replyId));
    } catch (err) {
      setError('Failed to delete reply');
      console.error('Error deleting reply:', err);
    }
  };

  /**
   * 渲染回复项
   */
  const renderReply = (reply: DiscussionReply) => {
    return (
      <div key={reply.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {reply.author_name}
            </span>
            <span className="text-xs text-gray-500">
              {reply.created_at ? new Date(reply.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {editingReplyId === reply.id ? (
              <>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={handleCancelEditReply}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  onClick={handleSaveEditReply}
                >
                  保存
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700"
                onClick={() => handleStartEditReply(reply)}
              >
                编辑
              </button>
            )}
            <button
              type="button"
              className="text-sm text-red-600 hover:text-red-800"
              onClick={() => handleDeleteReply(reply.id)}
            >
              删除
            </button>
          </div>
        </div>

        {editingReplyId === reply.id ? (
          <div className="mb-2">
            <textarea
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              rows={3}
              name="content"
              value={editReplyFormData.content}
              onChange={handleEditReplyChange}
              placeholder="编辑你的回复..."
            ></textarea>
          </div>
        ) : (
          <p className="text-gray-700 mb-2 whitespace-pre-wrap">
            {reply.content}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            onClick={() => handleReplyUpvote(reply.id)}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>点赞</span>
          </button>
        </div>
      </div>
    );
  };

  /**
   * 处理主题点赞
   */
  const handleTopicUpvote = async () => {
    try {
      // 实际项目中，这里应该调用API来更新点赞数
      // 现在只是模拟更新
      console.log('Topic upvoted:', topicId);
    } catch (err) {
      console.error('Error upvoting topic:', err);
    }
  };

  /**
   * 渲染加载状态
   */
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  /**
   * 渲染错误状态
   */
  if (error || !topic) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || '主题未找到'}</h1>
          <Link
            to="/discussions"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            返回讨论区
          </Link>
        </div>
      </div>
    );
  }

  /**
   * 渲染主题详情
   */
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 返回按钮 */}
      <Link
        to="/discussions"
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-8 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        返回讨论区
      </Link>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        {/* 主题标题和元数据 */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {topic.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{replies.length} 回复</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{topic.created_at ? new Date(topic.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </div>
          <button
            className="flex items-center gap-2 mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={handleTopicUpvote}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>点赞</span>
          </button>
        </div>

        {/* 主题分类 */}
        {topic.category && (
          <div className="flex items-center gap-2 mb-4">
            <Link
              to={`/discussions?category=${topic.category.id}`}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition"
            >
              <span className="capitalize">{topic.category.name}</span>
            </Link>
          </div>
        )}

        {/* 主题内容 */}
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap mb-6">
          {topic.content}
        </div>
      </div>

      {/* 回复表单 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">添加回复</h2>
        <form onSubmit={handleReplySubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="author-name" className="block text-sm font-medium text-gray-700 mb-1">您的姓名</label>
              <input
                type="text"
                id="author-name"
                name="authorName"
                value={replyFormData.authorName}
                onChange={handleReplyChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入您的姓名"
                required
              />
            </div>
            <div>
              <label htmlFor="author-email" className="block text-sm font-medium text-gray-700 mb-1">您的邮箱</label>
              <input
                type="email"
                id="author-email"
                name="authorEmail"
                value={replyFormData.authorEmail}
                onChange={handleReplyChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="输入您的邮箱"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">您的回复</label>
            <textarea
              id="content"
              name="content"
              value={replyFormData.content}
              onChange={handleReplyChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              rows={4}
              placeholder="输入您的回复"
              required
            ></textarea>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '提交中...' : '提交回复'}
            </button>
          </div>
        </form>
      </div>

      {/* 回复列表 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          回复 ({replies.length})
        </h2>
        {replies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              暂无回复，快来抢沙发吧！
            </p>
          </div>
        ) : (
          <div>
            {replies.map(reply => renderReply(reply))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TopicDetailPage;
