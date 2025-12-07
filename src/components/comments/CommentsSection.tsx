import React, { useState, useEffect } from 'react';
import type { Comment as CommentType } from '../../types';
import { commentService } from '../../services/commentService';
import { Comment } from './Comment';

interface CommentsSectionProps {
  articleId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ articleId }) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载评论
  const loadComments = async () => {
    setIsLoading(true);
    const fetchedComments = await commentService.getCommentsByArticleId(articleId);
    setComments(fetchedComments);
    setIsLoading(false);
  };

  // 初始加载评论
  useEffect(() => {
    loadComments();
  }, [articleId]);

  // 处理添加新评论
  const handleAddComment = async () => {
    if (!newCommentContent.trim()) return;

    setIsSubmitting(true);
    await commentService.createComment(
      articleId,
      newCommentContent,
      undefined,
      authorName
    );

    setNewCommentContent('');
    setAuthorName('');
    setIsSubmitting(false);
    loadComments();
  };

  // 按评论层级分组
  const groupCommentsByParent = () => {
    const rootComments = comments.filter(comment => !comment.parent_id);
    const childComments = comments.filter(comment => comment.parent_id);

    return rootComments.map(rootComment => ({
      ...rootComment,
      replies: childComments.filter(comment => comment.parent_id === rootComment.id)
    }));
  };

  const groupedComments = groupCommentsByParent();

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">
        Comments ({comments.length})
      </h2>

      {/* 添加新评论表单 */}
      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Add a Comment
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Anonymous"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Comment Content
            </label>
            <textarea
              value={newCommentContent}
              onChange={(e) => setNewCommentContent(e.target.value)}
              placeholder="Write your comment..."
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={isSubmitting || !newCommentContent.trim()}
              className="px-6 py-3 text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Comment'}
            </button>
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : groupedComments.length > 0 ? (
        <div className="space-y-6">
          {groupedComments.map((comment) => (
            <div key={comment.id}>
              <Comment
                comment={comment}
                articleId={articleId}
                onCommentAdded={loadComments}
                onCommentDeleted={loadComments}
              />
              
              {/* 显示回复 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 space-y-4 mt-2">
                  {comment.replies.map((reply) => (
                    <Comment
                      key={reply.id}
                      comment={reply}
                      articleId={articleId}
                      onCommentAdded={loadComments}
                      onCommentDeleted={loadComments}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 bg-neutral-50 dark:bg-gray-800/50 rounded-xl border border-neutral-200 dark:border-gray-700 text-center">
          <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            No comments yet
          </h3>
          <p className="text-neutral-500 dark:text-gray-500 text-sm">
            Be the first to comment on this article!
          </p>
        </div>
      )}
    </div>
  );
};
