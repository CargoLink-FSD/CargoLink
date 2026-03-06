import React, { useState, useEffect } from "react";
import ReactDOM from 'react-dom';
import { Star } from 'lucide-react';
import { paymentAPI } from "../../api/payment";
import { useNotification } from "../../context/NotificationContext";
import "../../styles/ReviewModal.css";

export default function ReviewModal({ orderId, onClose, onSuccess, isOpen }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen || !orderId) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return showNotification({ message: "Add a comment", type: "error" });

    setSubmitting(true);
    try {
      await paymentAPI.submitReview(orderId, { rating, comment });
      showNotification({ message: "Review submitted!", type: "success" });
      onSuccess();
    } catch (err) {
      showNotification({ message: "Failed to submit review", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="review-modal-overlay" onClick={handleOverlayClick}>
      <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Rate Delivery</h2>
        <div className="review-modal-star-selection">
          {[1, 2, 3, 4, 5].map((s) => (
            <span
              key={s}
              onClick={() => setRating(s)}
              className={`review-modal-star ${s <= rating ? "active" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Rate ${s} star${s === 1 ? '' : 's'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setRating(s);
              }}
            >
              <Star size={22} aria-hidden="true" fill={s <= rating ? 'currentColor' : 'none'} />
            </span>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your review..."
        />
        <div className="review-modal-actions">
          <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting} 
            className="btn-submit"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}