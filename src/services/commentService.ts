import { BaseService } from './baseService';
import type { Comment, CreateCommentData, UpdateCommentData } from '../types';


export class CommentService extends BaseService {
  private readonly TABLE_NAME = 'comments';
  private readonly CACHE_PREFIX = 'comment';

  /**
   * 获取文章的评论列表（包括回复）
   * @param articleId 文章ID
   */
  async getArticleComments(articleId: string): Promise<Comment[]> {
    const cacheKey = `${this.CACHE_PREFIX}:article:${articleId}`;
    
    return this.queryWithCache<Comment[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        this.checkSupabaseClient();
        
        const { data, error } = await this.supabase
          .from(this.TABLE_NAME)
          .select(`
            *,
            user:user_id (
              id,
              email,
              name,
              avatar_url
            )
          `)
          .eq('article_id', articleId)
          .eq('parent_id', null)
          .order('created_at', { ascending: false });

        if (error) {
          this.handleError(error, '获取评论列表', 'CommentService');
        }

        if (!data) {
          return [];
        }

        // 为每个顶级评论获取回复
        const commentsWithReplies = await Promise.all(
          data.map(async (comment) => {
            const replies = await this.getReplies(comment.id);
            return { ...comment, replies };
          }),
        );

        return commentsWithReplies as Comment[];
      } catch (error) {
        console.error('获取评论列表失败:', error);
        return [];
      }
    });
  }

  /**
   * 获取评论的回复
   * @param commentId 评论ID
   */
  private async getReplies(commentId: string): Promise<Comment[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from(this.TABLE_NAME)
        .select(`
          *,
          user:user_id (
            id,
            email,
            name,
            avatar_url
          )
        `)
        .eq('parent_id', commentId)
        .order('created_at', { ascending: true });

      if (error) {
        this.handleError(error, '获取回复', 'CommentService');
      }
      
      return data as Comment[] || [];
    } catch (error) {
      console.error('获取回复失败:', error);
      return [];
    }
  }

  /**
   * 创建评论
   * @param data 评论数据
   * @param authorName 作者名称（匿名评论时使用）
   * @param authorEmail 作者邮箱（匿名评论时使用）
   * @param authorUrl 作者URL（匿名评论时使用）
   */
  async createComment(data: CreateCommentData, authorName?: string, authorEmail?: string, authorUrl?: string): Promise<Comment | null> {
    try {
      // 支持匿名评论和登录用户评论
      const commentData: Partial<Comment> = {
        article_id: data.article_id,
        content: data.content,
        parent_id: data.parent_id || null,
        status: 'approved' as const, // 默认审核通过，后续可改为pending
      };

      // 如果用户已登录，使用用户信息
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        commentData.user_id = user.id;
      } else {
        // 否则使用匿名作者信息
        commentData.author_name = authorName || 'Anonymous';
        commentData.author_email = authorEmail || null;
        commentData.author_url = authorUrl || null;
      }

      return this.create<Comment>(this.TABLE_NAME, commentData, this.CACHE_PREFIX, 5 * 60 * 1000);
    } catch (error) {
      console.error('创建评论失败:', error);
      this.handleError(error, '创建评论', 'CommentService');
      return null;
    }
  }

  /**
   * 更新评论
   * @param commentId 评论ID
   * @param data 更新数据
   */
  async updateComment(commentId: string, data: UpdateCommentData): Promise<Comment | null> {
    try {
      const updateData: Partial<Comment> = {
        content: data.content,
        updated_at: new Date().toISOString(),
      };
      
      // 如果提供了status字段，更新评论状态
      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      return this.update<Comment>(this.TABLE_NAME, commentId, updateData, this.CACHE_PREFIX, 5 * 60 * 1000);
    } catch (error) {
      console.error('更新评论失败:', error);
      this.handleError(error, 'CommentService', '更新评论');
      return null;
    }
  }

  /**
   * 删除评论（软删除）
   * @param commentId 评论ID
   */
  async deleteComment(commentId: string): Promise<Comment | null> {
    try {
      const deleteData: Partial<Comment> = {
        is_deleted: true,
        content: '[已删除]',
        updated_at: new Date().toISOString(),
      };

      return this.update<Comment>(this.TABLE_NAME, commentId, deleteData, this.CACHE_PREFIX, 5 * 60 * 1000);
    } catch (error) {
      console.error('删除评论失败:', error);
      this.handleError(error, 'CommentService', '删除评论');
      return null;
    }
  }

  /**
   * 更新评论审核状态
   * @param commentId 评论ID
   * @param status 审核状态
   */
  async updateCommentStatus(commentId: string, status: Comment['status']): Promise<Comment | null> {
    try {
      const updateData: Partial<Comment> = {
        status,
        updated_at: new Date().toISOString(),
      };

      return this.update<Comment>(this.TABLE_NAME, commentId, updateData, this.CACHE_PREFIX, 5 * 60 * 1000);
    } catch (error) {
      console.error('更新评论审核状态失败:', error);
      this.handleError(error, 'CommentService', '更新评论审核状态');
      return null;
    }
  }

  /**
   * 获取待审核评论
   */
  async getPendingComments(): Promise<Comment[]> {
    const cacheKey = `${this.CACHE_PREFIX}:pending`;
    
    return this.queryWithCache<Comment[]>(cacheKey, 5 * 60 * 1000, async () => {
      try {
        this.checkSupabaseClient();
        
        const { data, error } = await this.supabase
          .from(this.TABLE_NAME)
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (error) {
          this.handleError(error, '获取待审核评论', 'CommentService');
        }

        return data as Comment[] || [];
      } catch (error) {
        console.error('获取待审核评论失败:', error);
        return [];
      }
    });
  }

  /**
   * 点赞/点踩评论
   * @param commentId 评论ID
   * @param voteType 投票类型（up或down）
   */
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<Comment | null> {
    try {
      this.checkSupabaseClient();
      
      // 这里可以添加更复杂的逻辑，比如记录用户的投票历史，防止重复投票
      // 目前只是简单地更新计数
      const updateField = voteType === 'up' ? 'upvotes' : 'downvotes';

      const { data: updatedComment, error } = await this.supabase
        .from(this.TABLE_NAME)
        .update({
          [updateField]: `${updateField} + 1`,
        })
        .eq('id', commentId)
        .select()
        .single();

      if (error) {
        this.handleError(error, '评论投票', 'CommentService');
      }
      
      // 清除相关缓存
      this.invalidateCache(`${this.CACHE_PREFIX}:*`);
      
      return updatedComment as Comment;
    } catch (error) {
      console.error('投票失败:', error);
      this.handleError(error, '评论投票', 'CommentService');
      return null;
    }
  }
}

export default new CommentService();
