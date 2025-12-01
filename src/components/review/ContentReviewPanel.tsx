/**
 * 内容审核面板组件
 * 用于管理和显示文章的审核状态、审核历史记录，并提供审核操作功能
 */
import React, { useState } from 'react';
import styles from './ContentReviewPanel.module.css';
import type { Article, ArticleReview } from '../../types';

interface ContentReviewPanelProps {
  article: Article;
  reviews?: ArticleReview[];
  onReviewSubmit?: (review: Partial<ArticleReview>) => void;
}

export const ContentReviewPanel: React.FC<ContentReviewPanelProps> = ({
  article,
  reviews = [],
  onReviewSubmit
}) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ArticleReview['review_status']>(article.review_status || 'pending');
  const [reviewComments, setReviewComments] = useState('');
  const [accuracyScore, setAccuracyScore] = useState<number>(article.accuracy_score || 0);
  const [hasAccuracyIssues, setHasAccuracyIssues] = useState<boolean>(article.has_accuracy_issues || false);
  const [isVerified, setIsVerified] = useState<boolean>(article.is_verified || false);
  const [verificationNotes, setVerificationNotes] = useState('');

  // 审核状态颜色映射
  const reviewStatusColors: Record<ArticleReview['review_status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    needs_revision: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
  };

  // 审核状态文本映射
  const reviewStatusText: Record<ArticleReview['review_status'], string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    needs_revision: '需要修改'
  };

  // 提交审核
  const handleSubmitReview = () => {
    if (onReviewSubmit) {
      onReviewSubmit({
        article_id: article.id,
        review_status: reviewStatus,
        review_comments: reviewComments,
        accuracy_score: accuracyScore,
        has_accuracy_issues: hasAccuracyIssues,
        is_verified: isVerified,
        verification_notes: verificationNotes
      });
      setIsReviewing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>内容审核</h2>
        <button
          onClick={() => setIsReviewing(!isReviewing)}
          className={styles.reviewButton}
        >
          {isReviewing ? '取消审核' : '开始审核'}
        </button>
      </div>

      {/* 当前审核状态 */}
      <div className={styles.statusSection}>
        <h3 className={styles.sectionTitle}>当前审核状态</h3>
        <div className={`${styles.statusBadge} ${reviewStatusColors[article.review_status || 'pending']}`}>
          {reviewStatusText[article.review_status || 'pending']}
        </div>
        
        {article.is_verified && (
          <div className={`${styles.statusBadge} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 mt-2`}>
            已验证内容
          </div>
        )}
        
        {article.accuracy_score !== undefined && (
          <div className={styles.accuracyScore}>
            <span className={styles.scoreLabel}>准确性评分:</span>
            <div className={styles.scoreStars}>
              {[...Array(5)].map((_, index) => (
                <span
                  key={index}
                  className={`${styles.star} ${index < article.accuracy_score! ? styles.filledStar : ''}`}
                >
                  ★
                </span>
              ))}
              <span className={styles.scoreNumber}>{article.accuracy_score}/5</span>
            </div>
          </div>
        )}
        
        {article.review_comments && (
          <div className={styles.reviewComments}>
            <h4 className={styles.commentsTitle}>审核意见:</h4>
            <p className={styles.commentsText}>{article.review_comments}</p>
          </div>
        )}
      </div>

      {/* 审核表单 */}
      {isReviewing && (
        <div className={styles.reviewForm}>
          <h3 className={styles.sectionTitle}>提交审核</h3>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>审核状态:</label>
            <select
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value as ArticleReview['review_status'])}
              className={styles.formSelect}
            >
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已拒绝</option>
              <option value="needs_revision">需要修改</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>准确性评分:</label>
            <div className={styles.scoreSelector}>
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  onClick={() => setAccuracyScore(score)}
                  className={`${styles.scoreButton} ${accuracyScore === score ? styles.activeScore : ''}`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="checkbox"
                checked={hasAccuracyIssues}
                onChange={(e) => setHasAccuracyIssues(e.target.checked)}
                className={styles.formCheckbox}
              />
              存在准确性问题
            </label>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className={styles.formCheckbox}
              />
              标记为已验证内容
            </label>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>审核意见:</label>
            <textarea
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              placeholder="请输入审核意见..."
              className={styles.formTextarea}
              rows={4}
            />
          </div>
          
          {isVerified && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>验证说明:</label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="请输入验证说明..."
                className={styles.formTextarea}
                rows={3}
              />
            </div>
          )}
          
          <div className={styles.formActions}>
            <button
              onClick={handleSubmitReview}
              className={styles.submitButton}
            >
              提交审核
            </button>
            <button
              onClick={() => setIsReviewing(false)}
              className={styles.cancelButton}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 审核历史记录 */}
      {reviews.length > 0 && (
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>审核历史记录</h3>
          <div className={styles.historyList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.historyItem}>
                <div className={styles.historyHeader}>
                  <div className={`${styles.historyStatus} ${reviewStatusColors[review.review_status]}`}>
                    {reviewStatusText[review.review_status]}
                  </div>
                  <div className={styles.historyDate}>
                    {new Date(review.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                
                <div className={styles.historyDetails}>
                  <div className={styles.historyReviewer}>
                    审核人: {review.reviewer_name || '匿名'}
                  </div>
                  
                  {review.accuracy_score !== undefined && (
                    <div className={styles.historyScore}>
                      准确性评分: {review.accuracy_score}/5
                    </div>
                  )}
                </div>
                
                {review.review_comments && (
                  <div className={styles.historyComments}>
                    {review.review_comments}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};