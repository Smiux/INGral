// 内容审核服务 - 用于处理内容审核相关的API调用
import { supabase } from '../lib/supabase';
import type { Article, ArticleReview } from '../types';

class ReviewService {
  // 获取文章的审核状态
  async getArticleReviewStatus(articleId: string): Promise<Article['review_status'] | null> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('review_status')
        .eq('id', articleId)
        .single();

      if (error) {
        throw error;
      }

      return data.review_status;
    } catch (error) {
      console.error('Error getting article review status:', error);
      return null;
    }
  }

  // 获取文章的审核历史记录
  async getArticleReviews(articleId: string): Promise<ArticleReview[]> {
    try {
      const { data, error } = await supabase
        .from('article_reviews')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting article reviews:', error);
      return [];
    }
  }

  // 提交文章审核
  async submitArticleReview(review: Partial<ArticleReview>): Promise<ArticleReview | null> {
    try {
      // 1. 创建审核记录
      const { data: reviewData, error: reviewError } = await supabase
        .from('article_reviews')
        .insert(review)
        .select('*')
        .single();

      if (reviewError) {
        throw reviewError;
      }

      // 2. 更新文章的审核状态
      const { error: articleError } = await supabase
        .from('articles')
        .update({
          review_status: review.review_status,
          reviewer_id: review.reviewer_id,
          reviewer_name: review.reviewer_name,
          review_date: new Date().toISOString(),
          review_comments: review.review_comments,
          accuracy_score: review.accuracy_score,
          has_accuracy_issues: review.has_accuracy_issues,
          is_verified: review.is_verified,
          verification_date: review.is_verified ? new Date().toISOString() : undefined,
          verification_notes: review.verification_notes
        })
        .eq('id', review.article_id!);

      if (articleError) {
        throw articleError;
      }

      return reviewData;
    } catch (error) {
      console.error('Error submitting article review:', error);
      return null;
    }
  }

  // 获取待审核的文章列表
  async getPendingReviews(limit: number = 10, offset: number = 0): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('review_status', 'pending')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting pending reviews:', error);
      return [];
    }
  }

  // 获取需要修改的文章列表
  async getNeedsRevisionArticles(limit: number = 10, offset: number = 0): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('review_status', 'needs_revision')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting needs revision articles:', error);
      return [];
    }
  }

  // 获取已通过审核的文章列表
  async getApprovedArticles(limit: number = 10, offset: number = 0): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('review_status', 'approved')
        .order('review_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting approved articles:', error);
      return [];
    }
  }

  // 获取已拒绝的文章列表
  async getRejectedArticles(limit: number = 10, offset: number = 0): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('review_status', 'rejected')
        .order('review_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting rejected articles:', error);
      return [];
    }
  }

  // 获取已验证的文章列表
  async getVerifiedArticles(limit: number = 10, offset: number = 0): Promise<Article[]> {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('is_verified', true)
        .order('verification_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting verified articles:', error);
      return [];
    }
  }
}

// 创建单例实例
const reviewService = new ReviewService();

export default reviewService;