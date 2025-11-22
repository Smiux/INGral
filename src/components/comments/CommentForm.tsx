import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

import commentService from '../../services/commentService';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  articleId: string;
  parentId?: string | null;
  onCommentCreated: () => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ 
  articleId, 
  parentId = null,
  onCommentCreated 
}) => {
  const authResult = useAuth();
  const { user, isLoading: authIsLoading } = authResult;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('请先登录');
      return;
    }
    
    if (!content.trim()) {
      setError('评论内容不能为空');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await commentService.createComment({
        article_id: articleId,
        content: content.trim(),
        parent_id: parentId
      });
      
      setContent('');
      onCommentCreated();
    } catch (err) {
      setError('发表评论失败');
      console.error('发表评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authIsLoading) {
    return <p className={styles.loading}>加载中...</p>;
  }

  if (!user) {
    return (
      <div className={styles.loginPrompt}>
        <p>请先登录后再发表评论</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? '写下你的回复...' : '写下你的评论...'}
        className={styles.textarea}
        rows={4}
      />
      
      {error && <p className={styles.error}>{error}</p>}
      
      <div className={styles.actions}>
        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={loading || !content.trim()}
        >
          {loading ? '发表中...' : '发表评论'}
        </button>
        
        <button 
          type="button" 
          onClick={() => setContent('')}
          className={styles.cancelButton}
          disabled={loading}
        >
          取消
        </button>
      </div>
    </form>
  );
};

export default CommentForm;