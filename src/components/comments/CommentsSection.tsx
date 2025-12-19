import React, { useState, useEffect, useCallback } from 'react';
import type { Comment as CommentType } from '../../types';
import { commentService } from '../../services/commentService';
import { Comment } from './Comment';
import { ChevronDown, ChevronUp, Filter, ArrowUpDown, ArrowRight, Clock, Star } from 'lucide-react';

interface CommentsSectionProps {
  articleId: string;
}

type SortOption = 'latest' | 'popular' | 'oldest';
type FilterOption = 'all' | 'with-replies';

export const CommentsSection: React.FC<CommentsSectionProps> = ({ articleId }) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新增功能：排序、分页、过滤
  const [sortOption, setSortOption] = useState<SortOption>('latest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [commentsPerPage] = useState(5);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 加载评论
  const loadComments = useCallback(async () => {
    setIsLoading(true);
    const fetchedComments = await commentService.getCommentsByArticleId(articleId);
    setComments(fetchedComments);
    setIsLoading(false);
  }, [articleId]);

  // 初始加载评论
  useEffect(() => {
    loadComments();
  }, [articleId, loadComments]);

  // 处理添加新评论
  const handleAddComment = async () => {
    if (!newCommentContent.trim()) {
      return;
    }

    setIsSubmitting(true);
    await commentService.createComment({
      articleId,
      'content': newCommentContent,
      authorName
    });

    setNewCommentContent('');
    setAuthorName('');
    setIsSubmitting(false);
    // 新评论添加后回到第一页
    setCurrentPage(1);
    loadComments();
  };

  // 按评论层级分组
  const groupCommentsByParent = () => {
    const rootComments = comments.filter(comment => !comment.parent_id);
    const childComments = comments.filter(comment => comment.parent_id);

    return rootComments.map(rootComment => ({
      ...rootComment,
      'replies': childComments.filter(comment => comment.parent_id === rootComment.id)
    }));
  };

  // 过滤评论
  const filteredComments = groupCommentsByParent().filter(comment => {
    if (filterOption === 'with-replies') {
      return comment.replies.length > 0;
    }
    return true;
  });

  // 排序评论
  const sortedComments = [...filteredComments].sort((a, b) => {
    switch (sortOption) {
      case 'latest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'popular':
        return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      default:
        return 0;
    }
  });

  // 分页逻辑
  const totalComments = sortedComments.length;
  const totalPages = Math.ceil(totalComments / commentsPerPage);
  const indexOfLastComment = currentPage * commentsPerPage;
  const indexOfFirstComment = indexOfLastComment - commentsPerPage;
  const currentComments = sortedComments.slice(indexOfFirstComment, indexOfLastComment);

  // 页码变化处理
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-6">
        Comments ({totalComments})
      </h2>

      {/* 新增：排序和过滤控件 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        {/* 排序控件 */}
        <div className="relative">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {sortOption === 'latest' && '最新'}
              {sortOption === 'popular' && '最受欢迎'}
              {sortOption === 'oldest' && '最旧'}
            </span>
            {isSortOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {isSortOpen && (
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setSortOption('latest');
                  setIsSortOpen(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${sortOption === 'latest' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>最新评论</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setSortOption('popular');
                  setIsSortOpen(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${sortOption === 'popular' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  <span>最受欢迎</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setSortOption('oldest');
                  setIsSortOpen(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${sortOption === 'oldest' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>最旧评论</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 过滤控件 */}
        <div className="relative">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {filterOption === 'all' && '所有评论'}
              {filterOption === 'with-replies' && '仅包含回复'}
            </span>
            {isFilterOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {isFilterOpen && (
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setFilterOption('all');
                  setIsFilterOpen(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${filterOption === 'all' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                所有评论
              </button>
              <button
                onClick={() => {
                  setFilterOption('with-replies');
                  setIsFilterOpen(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${filterOption === 'with-replies' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                仅包含回复
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 添加新评论表单 */}
      <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Add a Comment
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="author-name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Your Name (Optional)
            </label>
            <input
              id="author-name"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Anonymous"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label htmlFor="comment-content" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Comment Content
            </label>
            <textarea
              id="comment-content"
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
      ) : (
        <>
          {currentComments.length > 0 ? (
            <>
              <div className="space-y-6">
                {currentComments.map((comment) => (
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

              {/* 新增：分页控件 */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    首页
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>

                  {/* 页码显示 */}
                  {Array.from({ 'length': totalPages }, (_, i) => i + 1)
                    .filter(page =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, arr) => (
                      <React.Fragment key={page}>
                        {index > 0 && arr[index - 1] !== page - 1 && (
                          <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${currentPage === page ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    末页
                  </button>
                </div>
              )}
            </>
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
        </>
      )}
    </div>
  );
};
