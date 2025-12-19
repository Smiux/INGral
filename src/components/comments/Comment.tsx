import React, { useState } from 'react';
import type { Comment as CommentType } from '../../types';
import { commentService } from '../../services/commentService';
import { ThumbsUp, ThumbsDown, Reply, X } from 'lucide-react';

interface CommentProps {
  comment: CommentType;
  articleId: string;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}

export const Comment: React.FC<CommentProps> = ({ comment, articleId, onCommentAdded, onCommentDeleted }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isDownvoting, setIsDownvoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 处理回复评论
  const handleReply = async () => {
    if (!replyContent.trim()) {
      return;
    }

    await commentService.createComment({
      articleId,
      'content': replyContent,
      'parentId': comment.id
    });

    setReplyContent('');
    setIsReplying(false);
    onCommentAdded();
  };

  // 处理点赞
  const handleUpvote = async () => {
    setIsUpvoting(true);
    await commentService.upvoteComment(comment.id);
    setIsUpvoting(false);
    onCommentAdded();
  };

  // 处理取消点赞
  const handleDownvote = async () => {
    setIsDownvoting(true);
    await commentService.downvoteComment(comment.id);
    setIsDownvoting(false);
    onCommentAdded();
  };

  // 处理删除评论
  const handleDelete = async () => {
    setIsDeleting(true);
    await commentService.deleteComment(comment.id);
    setIsDeleting(false);
    onCommentDeleted();
  };

  return (
    <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out hover:shadow-md hover:translate-y-[-2px]">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">{comment.author_name}</h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{comment.content}</p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
          title="Delete Comment"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleUpvote}
          disabled={isUpvoting}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{comment.upvotes}</span>
        </button>
        <button
          onClick={handleDownvote}
          disabled={isDownvoting}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <ThumbsDown className="w-4 h-4" />
          <span>{comment.downvotes}</span>
        </button>
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
        >
          <Reply className="w-4 h-4" />
          <span>Reply</span>
        </button>
      </div>

      {/* 回复表单 */}
      {isReplying && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write your reply..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none mb-3"
            rows={3}
          ></textarea>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsReplying(false);
                setReplyContent('');
              }}
              className="px-4 py-2 text-sm text-gray-600 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReply}
              disabled={!replyContent.trim()}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
