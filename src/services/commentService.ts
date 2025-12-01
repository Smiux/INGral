import { BaseService } from './baseService';
import type { Comment, CreateCommentData, UpdateCommentData } from '../types';

export class CommentService extends BaseService {
  // 获取文章的评论列表
  async getArticleComments(articleId: string): Promise<Comment[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('comments')
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
        .order('created_at', { ascending: false })
        .returns<Comment[]>();

      if (error) {
        this.handleSupabaseError(error, '获取评论列表');
      }

      // 为每个顶级评论获取回复
      const commentsWithReplies = await Promise.all(
        data.map(async (comment) => {
          const replies = await this.getReplies(comment.id);
          return { ...comment, replies };
        }),
      );

      return commentsWithReplies;
    } catch (error) {
      console.error('获取评论列表失败:', error);
      throw error;
    }
  }

  // 获取评论的回复
  private async getReplies(commentId: string): Promise<Comment[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('comments')
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
        .order('created_at', { ascending: true })
        .returns<Comment[]>();

      if (error) {
        this.handleSupabaseError(error, '获取回复');
      }
      return data;
    } catch (error) {
      console.error('获取回复失败:', error);
      return [];
    }
  }

  // 创建评论
  async createComment(data: CreateCommentData, authorName?: string, authorEmail?: string, authorUrl?: string): Promise<Comment> {
    try {
      this.checkSupabaseClient();
      
      // 支持匿名评论和登录用户评论
      const { data: { user } } = await this.supabase.auth.getUser();
      
      const commentData: Partial<Comment> = {
        article_id: data.article_id,
        content: data.content,
        parent_id: data.parent_id || null,
        status: 'approved' as const, // 默认审核通过，后续可改为pending
      };

      // 如果用户已登录，使用用户信息
      if (user) {
        commentData.user_id = user.id;
      } else {
        // 否则使用匿名作者信息
        commentData.author_name = authorName || 'Anonymous';
        commentData.author_email = authorEmail || null;
        commentData.author_url = authorUrl || null;
      }

      const { data: newComment, error } = await this.supabase
        .from('comments')
        .insert(commentData)
        .select('*')
        .single();

      if (error) {
        this.handleSupabaseError(error, '创建评论');
      }
      return newComment;
    } catch (error) {
      console.error('创建评论失败:', error);
      throw error;
    }
  }

  // 更新评论
  async updateComment(commentId: string, data: UpdateCommentData): Promise<Comment> {
    try {
      this.checkSupabaseClient();
      
      const updateData: Partial<Comment> = {
        content: data.content,
        updated_at: new Date().toISOString(),
      };
      
      // 如果提供了status字段，更新评论状态
      if (data.status !== undefined) {
        updateData.status = data.status;
      }

      const { data: updatedComment, error } = await this.supabase
        .from('comments')
        .update(updateData)
        .eq('id', commentId)
        .select('*')
        .single<Comment>();

      if (error) {
        this.handleSupabaseError(error, '更新评论');
      }
      return updatedComment;
    } catch (error) {
      console.error('更新评论失败:', error);
      throw error;
    }
  }

  // 删除评论（软删除）
  async deleteComment(commentId: string): Promise<Comment> {
    try {
      this.checkSupabaseClient();
      
      const { data: deletedComment, error } = await this.supabase
        .from('comments')
        .update({
          is_deleted: true,
          content: '[已删除]',
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select()
        .single<Comment>();

      if (error) {
        this.handleSupabaseError(error, '删除评论');
      }
      return deletedComment;
    } catch (error) {
      console.error('删除评论失败:', error);
      throw error;
    }
  }

  // 更新评论审核状态
  async updateCommentStatus(commentId: string, status: Comment['status']): Promise<Comment> {
    try {
      this.checkSupabaseClient();
      
      const { data: updatedComment, error } = await this.supabase
        .from('comments')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .select('*')
        .single<Comment>();

      if (error) {
        this.handleSupabaseError(error, '更新评论审核状态');
      }
      return updatedComment;
    } catch (error) {
      console.error('更新评论审核状态失败:', error);
      throw error;
    }
  }

  // 获取待审核评论
  async getPendingComments(): Promise<Comment[]> {
    try {
      this.checkSupabaseClient();
      
      const { data, error } = await this.supabase
        .from('comments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .returns<Comment[]>();

      if (error) {
        this.handleSupabaseError(error, '获取待审核评论');
      }

      return data;
    } catch (error) {
      console.error('获取待审核评论失败:', error);
      throw error;
    }
  }

  // 点赞/点踩评论
  async voteComment(commentId: string, voteType: 'up' | 'down'): Promise<Comment> {
    try {
      this.checkSupabaseClient();
      
      // 这里可以添加更复杂的逻辑，比如记录用户的投票历史，防止重复投票
      // 目前只是简单地更新计数
      const updateField = voteType === 'up' ? 'upvotes' : 'downvotes';

      const { data: updatedComment, error } = await this.supabase
        .from('comments')
        .update({
          [updateField]: `${updateField} + 1`,
        })
        .eq('id', commentId)
        .select()
        .single<Comment>();

      if (error) {
        this.handleSupabaseError(error, '评论投票');
      }
      return updatedComment;
    } catch (error) {
      console.error('投票失败:', error);
      throw error;
    }
  }
}

export default new CommentService();
