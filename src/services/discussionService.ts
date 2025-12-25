import { BaseService } from './baseService';
import type { DiscussionCategory, DiscussionTopic, DiscussionReply } from '../types';


/**
 * 讨论服务类
 * 提供讨论相关的所有服务
 */
export class DiscussionService extends BaseService {
  // 表名常量
  private readonly CATEGORIES_TABLE = 'discussion_categories';

  private readonly TOPICS_TABLE = 'discussion_topics';

  private readonly REPLIES_TABLE = 'discussion_replies';

  /**
   * 获取所有讨论分类
   * @returns 讨论分类数组
   */
  async getCategories (): Promise<DiscussionCategory[]> {
    try {
      this.checkSupabaseClient();

      const { data, error } = await this.supabase
        .from(this.CATEGORIES_TABLE)
        .select('*')
        .order('name', { 'ascending': true });

      if (error) {
        this.handleError(error, '获取讨论分类', 'DiscussionService');
      }

      return this.handleSuccessResponse(data, []);
    } catch (error) {
      console.error('获取讨论分类错误:', error);
      return [];
    }
  }

  /**
   * 根据Slug获取分类
   * @param slug 分类Slug
   * @returns 讨论分类
   */
  async getCategoryBySlug (slug: string): Promise<DiscussionCategory | null> {
    try {
      this.checkSupabaseClient();

      const { data, error } = await this.supabase
        .from(this.CATEGORIES_TABLE)
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        this.handleError(error, '根据Slug获取分类', 'DiscussionService');
      }

      return data || null;
    } catch (error) {
      console.error('根据Slug获取分类错误:', error);
      return null;
    }
  }

  /**
   * 获取分类下的主题列表
   * @param categoryId 分类ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @param sortBy 排序字段
   * @param searchQuery 搜索关键词
   * @returns 主题数组和总数
   */
  async getTopicsByCategory ({
    categoryId,
    limit = 20,
    offset = 0,
    sortBy = 'time',
    searchQuery
  }: {
    categoryId: number;
    limit?: number;
    offset?: number;
    sortBy?: 'time' | 'random';
    searchQuery?: string;
  }): Promise<{ data: DiscussionTopic[]; count: number | undefined }> {
    try {
      this.checkSupabaseClient();

      // 构建查询
      let query = this.supabase
        .from(this.TOPICS_TABLE)
        .select('*', { 'count': 'exact' })
        .eq('category_id', categoryId);

      // 应用搜索查询
      if (searchQuery && searchQuery.trim() !== '') {
        const trimmedQuery = searchQuery.trim();
        query = query.or(
          `title.ilike.%${trimmedQuery}%,content.ilike.%${trimmedQuery}%`
        );
      }

      // 应用排序
      if (sortBy === 'random') {
        query = query.order('RANDOM()');
      } else {
        // 默认按更新时间排序，置顶主题优先
        query = query.order('is_pinned', { 'ascending': false }).order('updated_at', { 'ascending': false });
      }

      // 应用分页
      query = this.applyPagination(query, limit, offset);

      const { data, count, error } = await query;

      if (error) {
        this.handleError(error, '获取分类主题列表', 'DiscussionService');
      }

      return {
        'data': this.handleSuccessResponse(data, []),
        'count': count || undefined
      };
    } catch (error) {
      console.error('获取分类主题列表错误:', error);
      return { 'data': [], 'count': undefined };
    }
  }

  /**
   * 获取主题详情
   * @param topicId 主题ID
   * @returns 主题详情
   */
  async getTopicById (topicId: number): Promise<DiscussionTopic | null> {
    try {
      this.checkSupabaseClient();

      // 增加浏览次数
      await this.supabase
        .from(this.TOPICS_TABLE)
        .update({ 'view_count': this.supabase.rpc('increment', { 'value': 1 }) })
        .eq('id', topicId);

      const { data, error } = await this.supabase
        .from(this.TOPICS_TABLE)
        .select('*, category:category_id(*)')
        .eq('id', topicId)
        .single();

      if (error) {
        this.handleError(error, '获取主题详情', 'DiscussionService');
      }

      return data || null;
    } catch (error) {
      console.error('获取主题详情错误:', error);
      return null;
    }
  }

  /**
   * 创建主题
   * @param topic 主题数据
   * @returns 创建的主题
   */
  async createTopic (
    topic: Omit<DiscussionTopic, 'id' | 'reply_count' | 'view_count' | 'is_pinned' | 'created_at' | 'updated_at'>
  ): Promise<DiscussionTopic | null> {
    try {
      this.checkSupabaseClient();

      const { 'data': newTopic, error } = await this.supabase
        .from(this.TOPICS_TABLE)
        .insert(topic)
        .select('*')
        .single();

      if (error) {
        this.handleError(error, '创建主题', 'DiscussionService');
      }

      if (!newTopic) {
        return null;
      }

      return newTopic;
    } catch (error) {
      console.error('创建主题错误:', error);
      return null;
    }
  }

  /**
   * 获取主题回复
   * @param topicId 主题ID
   * @param limit 每页数量
   * @param offset 偏移量
   * @returns 回复数组和总数
   */
  async getTopicReplies (topicId: number, limit = 20, offset = 0): Promise<{ data: DiscussionReply[]; count: number | undefined }> {
    try {
      this.checkSupabaseClient();

      // 先获取所有回复，用于构建回复树
      const { 'data': allReplies, count, error } = await this.supabase
        .from(this.REPLIES_TABLE)
        .select('*', { 'count': 'exact' })
        .eq('topic_id', topicId);

      if (error) {
        this.handleError(error, '获取主题回复', 'DiscussionService');
      }

      // 构建回复树
      const replies = this.handleSuccessResponse(allReplies, []);
      const replyTree = this.buildReplyTree(replies);

      // 应用分页
      const paginatedReplies = replyTree.slice(offset, offset + limit);

      return {
        'data': paginatedReplies,
        'count': count || undefined
      };
    } catch (error) {
      console.error('获取主题回复错误:', error);
      return { 'data': [], 'count': undefined };
    }
  }

  /**
   * 构建回复树
   * @param replies 回复数组
   * @returns 回复树
   */
  private buildReplyTree (replies: DiscussionReply[]): DiscussionReply[] {
    const replyMap = new Map<number, DiscussionReply>();
    const rootReplies: DiscussionReply[] = [];

    // 首先将所有回复放入映射中
    replies.forEach(reply => {
      replyMap.set(reply.id, { ...reply, 'replies': [] });
    });

    // 然后构建树结构
    replies.forEach(reply => {
      const currentReply = replyMap.get(reply.id)!;
      if (reply.parent_id) {
        const parentReply = replyMap.get(reply.parent_id);
        if (parentReply) {
          parentReply.replies?.push(currentReply);
        }
      } else {
        rootReplies.push(currentReply);
      }
    });

    return rootReplies;
  }

  /**
   * 创建回复
   * @param reply 回复数据
   * @returns 创建的回复
   */
  async createReply (
    reply: Omit<DiscussionReply, 'id' | 'created_at' | 'replies'>
  ): Promise<DiscussionReply | null> {
    try {
      this.checkSupabaseClient();

      const { data, error } = await this.supabase
        .from(this.REPLIES_TABLE)
        .insert(reply)
        .select('*')
        .single();

      if (error) {
        this.handleError(error, '创建回复', 'DiscussionService');
      }

      return data || null;
    } catch (error) {
      console.error('创建回复错误:', error);
      return null;
    }
  }

  /**
   * 搜索主题
   * @param query 搜索关键词
   * @param limit 限制数量
   * @returns 匹配的主题数组
   */
  async searchTopics (query: string, limit = 20): Promise<DiscussionTopic[]> {
    try {
      this.checkSupabaseClient();

      const { data, error } = await this.supabase
        .from(this.TOPICS_TABLE)
        .select('*')
        .ilike('title', `%${query}%`)
        .or(`ilike(content, '%${query}%')`)
        .limit(limit);

      if (error) {
        this.handleError(error, '搜索主题', 'DiscussionService');
      }

      return this.handleSuccessResponse(data, []);
    } catch (error) {
      console.error('搜索主题错误:', error);
      return [];
    }
  }
}

// 导出单例实例
export const discussionService = new DiscussionService();
