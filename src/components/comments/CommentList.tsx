import React, { useState, useEffect, useCallback } from 'react';
import type { Comment } from '../../types';
import styles from './CommentList.module.css';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';
import { commentService } from '../../services/commentService';

interface CommentListProps {
  articleId: string;
}

const CommentList: React.FC<CommentListProps> = ({ articleId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载文章评论
  const loadComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 使用commentService获取文章评论
      const articleComments = await commentService.getCommentsByArticleId(articleId);
      setComments(articleComments);
    } catch (err) {
      setError('加载评论失败，请稍后重试');
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  // 加载文章评论
  useEffect(() => {
    loadComments();
  }, [articleId, loadComments]);

  // 处理评论投票
  const handleVote = async (commentId: string, voteType: 'up' | 'down') => {
    try {
      if (voteType === 'up') {
        await commentService.upvoteComment(commentId);
      } else {
        await commentService.downvoteComment(commentId);
      }
      // 重新加载评论数据
      await loadComments();
    } catch (err) {
      console.error('Failed to vote comment:', err);
    }
  };

  // 处理评论编辑
  const handleEdit = async () => {
    try {
      // 暂时不实现编辑功能，因为CommentService中没有updateComment方法
      // 直接重新加载评论数据
      await loadComments();
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  // 处理评论删除
  const handleDelete = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      // 重新加载评论数据
      await loadComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>评论 ({comments.length})</h3>

      <CommentForm articleId={articleId} onCommentCreated={loadComments} />

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
              onVote={handleVote}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentList;