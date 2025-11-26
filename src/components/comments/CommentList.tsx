import React, { useState, useEffect } from 'react';
import { Comment } from '../../types/comment';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import commentService from '../../services/commentService';
import styles from './CommentList.module.css';

interface CommentListProps {
  articleId: string;
}

const CommentList: React.FC<CommentListProps> = ({ articleId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await commentService.getArticleComments(articleId);
      setComments(data);
    } catch (err) {
      setError('加载评论失败');
      console.error('加载评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [articleId, refreshKey]);

  const handleCommentCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCommentUpdated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCommentDeleted = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>评论 ({comments.length})</h3>
      
      <CommentForm 
        articleId={articleId} 
        onCommentCreated={handleCommentCreated} 
      />

      {loading && <p className={styles.loading}>加载评论中...</p>}
      {error && <p className={styles.error}>{error}</p>}
      
      {!loading && !error && comments.length === 0 && (
        <p className={styles.empty}>还没有评论，快来发表第一条评论吧！</p>
      )}

      {!loading && !error && comments.length > 0 && (
        <div className={styles.comments}>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              articleId={articleId}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
              onReplyCreated={handleCommentCreated}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentList;