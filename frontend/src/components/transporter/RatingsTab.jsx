import React from 'react';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import '../../styles/profile.css';

const RatingsTab = ({ ratings }) => {
  if (!ratings) {
    return (
      <div className="profile-content">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--gray-500)' }}>
            Loading ratings and reviews...
          </p>
        </div>
      </div>
    );
  }

  const { averageRating, totalReviews, reviews } = ratings;

  return (
    <div className="ratings-tab-content">
      {/* Top Section: Circle and Bars */}
      <div className="rating-overview-card">
        <div className="rating-visual-column">
          <div className="rating-circle-box">
            <span className="rating-big-num">{averageRating.toFixed(1)}</span>
            <span className="rating-sub-text">out of 5</span>
          </div>
          <div className="rating-stars-large">
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} className={`star ${s <= averageRating ? 'filled' : ''}`}>★</span>
            ))}
          </div>
          <p className="rating-count-footer">Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</p>
        </div>

        <div className="rating-bars-column">
          <h3 className="breakdown-header">Rating Breakdown</h3>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter(r => Math.round(r.rating) === star).length;
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="breakdown-item">
                <span className="breakdown-label">{star} stars</span>
                <div className="breakdown-progress-bg">
                  <div className="breakdown-progress-fill" style={{ width: `${percentage}%` }}></div>
                </div>
                <span className="breakdown-val">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="reviews-divider" />

      {/* Bottom Section: Reviews List */}
      <div className="reviews-list-wrapper">
        <div className="reviews-list-header">
          <h2 className="reviews-list-title">Customer Reviews</h2>
          {/* <button className="write-review-btn-alt">Write a Review</button> */}
        </div>

        {reviews.length === 0 ? (
          <p className="empty-reviews-text">No reviews yet.</p>
        ) : (
          <div className="reviews-container-stack">
            {reviews.map((review) => (
              <div key={review.id} className="review-item-row">
                <div className="review-user-header">
                  <div className="review-user-avatar">
                    {review.customerName?.charAt(0) || 'U'}
                  </div>
                  <div className="review-user-meta">
                    <div className="review-top-line">
                      <span className="review-user-name">{review.customerName}</span>
                      <span className="review-timestamp">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    {review.orderInfo && (
                      <p className="review-order-route">
                        {review.orderInfo.pickup} → {review.orderInfo.delivery}
                      </p>
                    )}
                  </div>
                </div>

                <div className="review-stars-small-row">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={`star ${s <= review.rating ? 'filled' : ''}`}>★</span>
                  ))}
                </div>

                <p className="review-comment-body">{review.comment}</p>

                <div className="review-footer-actions">
                  {/* <button className="review-foot-btn"><ThumbsUp size={14} /> Helpful (12)</button> */}
                  {/* <button className="review-foot-btn"><MessageSquare size={14} /> Reply</button> */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingsTab;