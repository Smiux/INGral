import React, { useState } from 'react';
import { Comment } from '../../types/comment';
import CommentForm from './CommentForm';
import commentService from '../../services/commentService';
import { useAuth } from '../../hooks/useAuth';
import styles from './CommentItem.module.css';

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  onCommentUpdated: () => void;
  onCommentDeleted: () => void;
  onReplyCreated: () => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  articleId,
  onCommentUpdated,
  onCommentDeleted,
  onReplyCreated
}) => {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthor = user?.id === comment.user_id;

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这条评论吗？')) return;
    
    setLoading(true);
    setError(null);
    try {
      await commentService.deleteComment(comment.id);
      onCommentDeleted();
    } catch (err) {
      setError('删除评论失败');
      console.error('删除评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) {
      setError('评论内容不能为空');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await commentService.updateComment(comment.id, { content: editContent });
      setIsEditing(false);
      onCommentUpdated();
    } catch (err) {
      setError('更新评论失败');
      console.error('更新评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteType: 'up' | 'down') => {
    setLoading(true);
    setError(null);
    try {
      await commentService.voteComment(comment.id, voteType);
      onCommentUpdated();
    } catch (err) {
      setError('投票失败');
      console.error('投票失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (comment.is_deleted) {
    return (
      <div className={`${styles.container} ${styles.deleted}`}>
        <p className={styles.deletedText}>[已删除]</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {comment.user?.avatar_url && (
          <img 
            src={comment.user.avatar_url} 
            alt={comment.user.name || '用户头像'} 
            className={styles.avatar}
          />
        )}
        <div className={styles.userInfo}>
          <h4 className={styles.username}>
            {comment.user?.name || '匿名用户'}
          </h4>
          <p className={styles.time}>
            {new Date(comment.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {isEditing ? (
          <div className={styles.editForm}>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={styles.editTextarea}
              placeholder="编辑你的评论..."
            />
            <div className={styles.editActions}>
              <button 
                onClick={handleEdit} 
                className={styles.saveButton}
                disabled={loading}
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(comment.content);
                }} 
                className={styles.cancelButton}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <p>{comment.content}</p>
        )}
      </div>

      <div className={styles.actions}>
        <button 
          onClick={() => handleVote('up')}
          className={`${styles.voteButton} ${styles.upvote}`}
          disabled={loading}
        >
          👍 {comment.upvotes}
        </button>
        <button 
          onClick={() => handleVote('down')}
          className={`${styles.voteButton} ${styles.downvote}`}
          disabled={loading}
        >
          👎 {comment.downvotes}
        </button>
        
        {user && (
          <button 
            onClick={() => setShowReplyForm(!showReplyForm)}
            className={styles.replyButton}
            disabled={loading}
          >
            {showReplyForm ? '取消回复' : '回复'}
          </button>
        )}
        
        {isAuthor && !isEditing && (
          <>
            <button 
              onClick={() => setIsEditing(true)}
              className={styles.editButton}
              disabled={loading}
            >
              编辑
            </button>
            <button 
              onClick={handleDelete}
              className={styles.deleteButton}
              disabled={loading}
            >
              删除
            </button>
          </>
        )}
      </div>

      {showReplyForm && user && (
        <div className={styles.replyFormContainer}>
          <CommentForm 
            articleId={articleId} 
            parentId={comment.id}
            onCommentCreated={() => {
              setShowReplyForm(false);
              onReplyCreated();
            }}
          />
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {comment.replies && comment.replies.length > 0 && (
        <div className={styles.replies}>
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              onCommentUpdated={onCommentUpdated}
              onCommentDeleted={onCommentDeleted}
              onReplyCreated={onReplyCreated}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;