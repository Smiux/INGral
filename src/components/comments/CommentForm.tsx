import React, { useState } from 'react';
import { commentService } from '../../services/commentService';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  articleId: string;
  parentId?: string | null;
  onCommentCreated?: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ articleId, parentId, onCommentCreated }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthorInfo, setShowAuthorInfo] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [authorUrl, setAuthorUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await commentService.createComment(
        articleId,
        content,
        parentId || undefined,
        authorName,
        authorEmail,
        authorUrl
      );
      
      // 重置表单
      setContent('');
      setAuthorName('');
      setAuthorEmail('');
      setAuthorUrl('');
      
      // 通知父组件评论已创建
      if (onCommentCreated) {
        onCommentCreated();
      }
    } catch (error) {
      console.error('创建评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.commentForm}>
      <div className="mb-4">
        <textarea
          className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
          rows={4}
          placeholder="写下你的评论..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          inputMode="text"
          autoComplete="off"
        />
      </div>
      
      {/* 作者信息 */}
      <div className={styles.authorInfo}>
        <div className="flex items-center mb-2">
          <button
            type="button"
            className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
            onClick={() => setShowAuthorInfo(!showAuthorInfo)}
            disabled={isSubmitting}
          >
            <span className="mr-1">{showAuthorInfo ? '收起' : '展开'}</span>
            作者信息
          </button>
          <span className="text-xs text-gray-500 ml-2">（可选）</span>
        </div>
        
        {showAuthorInfo && (
          <div className={styles.authorFields}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="authorName" className="block text-xs font-medium text-gray-700 mb-1">
                  昵称
                </label>
                <input
                  type="text"
                  id="authorName"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                  placeholder="匿名用户"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  disabled={isSubmitting}
                  inputMode="text"
                  autoComplete="name"
                />
              </div>
              <div>
                <label htmlFor="authorEmail" className="block text-xs font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  id="authorEmail"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                  placeholder="your@email.com"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  disabled={isSubmitting}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="authorUrl" className="block text-xs font-medium text-gray-700 mb-1">
                  网站
                </label>
                <input
                  type="url"
                  id="authorUrl"
                  className="w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                  placeholder="https://yourwebsite.com"
                  value={authorUrl}
                  onChange={(e) => setAuthorUrl(e.target.value)}
                  disabled={isSubmitting}
                  inputMode="url"
                  autoComplete="url"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? '提交中...' : parentId ? '回复' : '发表评论'}
        </button>
      </div>
    </form>
  );
};

export default CommentForm;