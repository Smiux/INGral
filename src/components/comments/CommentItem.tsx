import React, { useState } from 'react';
import type { Comment } from '../../types';
import CommentForm from './CommentForm';
import { commentService } from '../../services/commentService';

interface CommentItemProps {
  comment: Comment;
  articleId: string;
  depth?: number;
  onVote?: ((_commentId: string, _voteType: 'up' | 'down') => void) | undefined;
  onDelete?: ((_commentId: string) => void) | undefined;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  articleId,
  depth = 0,
  onVote,
  onDelete
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 限制最大嵌套深度为3
  const maxDepth = 3;
  const isMaxDepth = depth >= maxDepth;

  const handleVote = async (voteType: 'up' | 'down') => {
    try {
      setIsLoading(true);
      if (voteType === 'up') {
        await commentService.upvoteComment(comment.id);
      } else {
        await commentService.downvoteComment(comment.id);
      }
      if (onVote) {
        onVote(comment.id, voteType);
      }
    } catch (error) {
      console.error('投票失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await commentService.deleteComment(comment.id);
      if (onDelete) {
        onDelete(comment.id);
      }
    } catch (error) {
      console.error('删除评论失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`mb-4 ${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {comment.author_name?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <div className="flex items-center">
                <h4 className="text-sm font-medium text-gray-900">
                  {comment.author_name || '匿名用户'}
                </h4>
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              {comment.is_deleted ? (
                <p className="mt-1 text-sm text-gray-500 italic">[已删除]</p>
              ) : (
                <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="text-xs text-gray-500 hover:text-blue-500 flex items-center"
              onClick={() => handleVote('up')}
              disabled={isLoading}
            >
              <span className="mr-1">▲</span>
              {comment.upvotes}
            </button>
            <button
              className="text-xs text-gray-500 hover:text-red-500 flex items-center"
              onClick={() => handleVote('down')}
              disabled={isLoading}
            >
              <span className="mr-1">▼</span>
              {comment.downvotes}
            </button>
            {!comment.is_deleted && (
              <button
                className="text-xs text-gray-500 hover:text-red-500"
                onClick={handleDelete}
                disabled={isLoading}
              >
                删除
              </button>
            )}
          </div>
        </div>
        <div className="mt-3">
          <button
            className="text-xs text-blue-500 hover:text-blue-700"
            onClick={() => setIsReplying(!isReplying)}
            disabled={isLoading}
          >
            {isReplying ? '取消回复' : '回复'}
          </button>
          {isReplying && !isMaxDepth && (
            <div className="mt-3">
              <CommentForm
                articleId={articleId}
                parentId={comment.id}
                onCommentCreated={() => setIsReplying(false)}
              />
            </div>
          )}
        </div>
      </div>
      {/* 递归渲染回复 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              articleId={articleId}
              depth={depth + 1}
              onVote={onVote}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
