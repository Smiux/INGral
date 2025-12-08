import { CommentService } from './commentService';
import { BaseService } from './baseService';
import type { Comment } from '../types';
import { CommentStatus } from '../types';

// Mock the BaseService dependencies
jest.mock('./baseService');

// Create a new instance of CommentService for testing
const commentService = new CommentService();

// Mock implementation for the service methods
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue({ data: null }),
  insert: jest.fn().mockResolvedValue({ data: { id: 'test-comment-id', content: 'Test comment', article_id: 'test-article-id', created_at: new Date().toISOString() } }),
  update: jest.fn().mockResolvedValue({ data: { id: 'test-comment-id', content: 'Updated comment', article_id: 'test-article-id', created_at: new Date().toISOString() } }),
  delete: jest.fn().mockResolvedValue({ data: { id: 'test-comment-id' } }),
};

// Mock the create method
(BaseService.prototype as unknown as { create: jest.Mock }).create = jest.fn().mockImplementation((_tableName, data) => Promise.resolve({ id: 'test-comment-id', ...data }));

describe('CommentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCommentsByArticleId', () => {
    it('should fetch comments for an article', async () => {
      const articleId = 'test-article-id';
      const mockComments: Comment[] = [
        {
          id: 'comment-1',
          article_id: articleId,
          content: 'Test comment 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author_name: 'Test User',
          author_email: 'test@example.com',
          author_url: 'https://example.com',
          upvotes: 0,
          downvotes: 0,
          is_deleted: false,
          parent_id: null,
          status: CommentStatus.APPROVED,
        },
      ];

      mockSupabase.select.mockResolvedValue({ data: mockComments });

      const comments = await commentService.getCommentsByArticleId(articleId);

      expect(comments).toEqual(mockComments);
      expect(mockSupabase.from).toHaveBeenCalledWith('comments');
      expect(mockSupabase.eq).toHaveBeenCalledWith('article_id', articleId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_deleted', false);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return empty array when no comments found', async () => {
      const articleId = 'test-article-id';

      mockSupabase.select.mockResolvedValue({ data: [] });

      const comments = await commentService.getCommentsByArticleId(articleId);

      expect(comments).toEqual([]);
      expect(mockSupabase.from).toHaveBeenCalledWith('comments');
    });
  });

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const articleId = 'test-article-id';
      const content = 'Test comment content';
      const authorName = 'Test Author';

      const result = await commentService.createComment(articleId, content, undefined, authorName);

      expect(result).toEqual({
        id: 'test-comment-id',
        article_id: articleId,
        content,
        parent_id: null,
        author_name: authorName,
      });
      expect((BaseService.prototype as unknown as { create: jest.Mock }).create).toHaveBeenCalled();
    });

    it('should create a nested comment with parentId', async () => {
      const articleId = 'test-article-id';
      const content = 'Test nested comment';
      const parentId = 'parent-comment-id';

      const result = await commentService.createComment(articleId, content, parentId);

      expect(result).toEqual({
        id: 'test-comment-id',
        article_id: articleId,
        content,
        parent_id: parentId,
        author_name: 'Anonymous',
      });
    });
  });

  describe('upvoteComment', () => {
    it('should upvote a comment', async () => {
      const commentId = 'test-comment-id';

      const result = await commentService.upvoteComment(commentId);

      expect(result).toBe(true);
    });
  });

  describe('downvoteComment', () => {
    it('should downvote a comment', async () => {
      const commentId = 'test-comment-id';

      const result = await commentService.downvoteComment(commentId);

      expect(result).toBe(true);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      const commentId = 'test-comment-id';

      const result = await commentService.deleteComment(commentId);

      expect(result).toBe(true);
    });
  });
});
