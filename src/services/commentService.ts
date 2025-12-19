import { BaseService } from './baseService';
import type { Comment } from '../types';

/**
 * 评论服务类，处理评论相关操作
 */
export class CommentService extends BaseService {
  private readonly TABLE_NAME = 'comments';

  /**
   * 按文章ID获取评论
   * @param articleId 文章ID
   */
  async getCommentsByArticleId (articleId: string): Promise<Comment[]> {
    try {
      const result = await this.supabase.from(this.TABLE_NAME)
        .select('*')
        .eq('article_id', articleId)
        .eq('is_deleted', false)
        .order('created_at', { 'ascending': false });

      return result.data || [];
    } catch (error) {
      this.handleError(error, 'CommentService', '按文章ID获取评论');
      return [];
    }
  }

  /**
   * 创建评论
   * @param articleId 文章ID
   * @param content 评论内容
   * @param parentId 父评论ID（可选，用于嵌套评论）
   * @param authorName 作者名称
   * @param authorEmail 作者邮箱
   * @param authorUrl 作者URL
   */
  async createComment ({
    articleId,
    content,
    parentId,
    authorName,
    authorEmail,
    authorUrl
  }: {
    articleId: string;
    content: string;
    parentId?: string;
    authorName?: string;
    authorEmail?: string;
    authorUrl?: string;
  }): Promise<Comment | null> {
    const commentData = {
      'article_id': articleId,
      content,
      'parent_id': parentId || null,
      'author_name': authorName || 'Anonymous',
      'author_email': authorEmail || null,
      'author_url': authorUrl || null
    };

    try {
      return await this.create<Comment>(this.TABLE_NAME, commentData);
    } catch (err) {
      this.handleError(err, 'CommentService', '创建评论');
      return null;
    }
  }

  /**
   * 点赞评论
   * @param commentId 评论ID
   */
  async upvoteComment (commentId: string): Promise<boolean> {
    try {
      // 直接使用查询+更新的方式，避免RPC调用失败
      // 获取当前评论
      const { 'data': comment } = await this.supabase.from(this.TABLE_NAME)
        .select('upvotes')
        .eq('id', commentId)
        .single();

      if (comment) {
        // 更新点赞数
        await this.supabase.from(this.TABLE_NAME)
          .update({ 'upvotes': (comment.upvotes || 0) + 1 })
          .eq('id', commentId);

        return true;
      }

      return false;
    } catch (err) {
      this.handleError(err, 'CommentService', '点赞评论');
      return false;
    }
  }

  /**
   * 取消点赞评论
   * @param commentId 评论ID
   */
  async downvoteComment (commentId: string): Promise<boolean> {
    try {
      // 直接使用查询+更新的方式，避免RPC调用失败
      // 获取当前评论
      const { 'data': comment } = await this.supabase.from(this.TABLE_NAME)
        .select('downvotes')
        .eq('id', commentId)
        .single();

      if (comment) {
        // 更新点赞数
        await this.supabase.from(this.TABLE_NAME)
          .update({ 'downvotes': (comment.downvotes || 0) + 1 })
          .eq('id', commentId);

        return true;
      }

      return false;
    } catch (err) {
      this.handleError(err, 'CommentService', '取消点赞评论');
      return false;
    }
  }

  /**
   * 删除评论（软删除）
   * @param commentId 评论ID
   */
  async deleteComment (commentId: string): Promise<boolean> {
    try {
      await this.supabase.from(this.TABLE_NAME)
        .update({ 'is_deleted': true })
        .eq('id', commentId);

      return true;
    } catch (err) {
      this.handleError(err, 'CommentService', '删除评论');
      return false;
    }
  }
}

// 导出单例实例
export const commentService = new CommentService();
