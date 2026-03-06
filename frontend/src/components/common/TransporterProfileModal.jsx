import React, { useEffect, useState } from 'react';
import http from '../../api/http';

export function StarRating({ rating = 0, size = 16 }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push(
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push(
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1">
          <defs>
            <linearGradient id={`half-${i}`}>
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="none" />
            </linearGradient>
          </defs>
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill={`url(#half-${i})`}
            stroke="#f59e0b"
          />
        </svg>
      );
    } else {
      stars.push(
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    }
  }

  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>{stars}</span>;
}

export default function TransporterProfileModal({ transporterId, transporterName, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!transporterId) return;
    setLoading(true);
    setError(null);
    http
      .get(`/api/transporters/${transporterId}/public-profile`)
      .then((res) => setProfile(res.data))
      .catch(() => setError('Failed to load transporter profile.'))
      .finally(() => setLoading(false));
  }, [transporterId]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev || ''; };
  }, []);

  return (
    <div className="tpm-overlay" onClick={onClose}>
      <div className="tpm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tpm-header">
          <h3 className="tpm-title">
            {transporterName || 'Transporter Profile'}
          </h3>
          <button className="tpm-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tpm-body">
          {loading && (
            <div className="tpm-loading">
              <div className="spinner" />
              <p>Loading profile…</p>
            </div>
          )}

          {error && !loading && (
            <div className="tpm-error">
              <p>{error}</p>
            </div>
          )}

          {profile && !loading && (
            <>
              {/* Avatar / Company name */}
              <div className="tpm-avatar-row">
                {profile.profile_photo ? (
                  <img
                    src={`http://localhost:3000${profile.profile_photo}`}
                    alt={profile.company_name || profile.name}
                    className="tpm-avatar"
                  />
                ) : (
                  <div className="tpm-avatar tpm-avatar-placeholder">
                    {(profile.company_name || profile.name || 'T')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="tpm-company-name">{profile.company_name || profile.name}</div>
                  {profile.averageRating > 0 && (
                    <div className="tpm-rating-row">
                      <StarRating rating={profile.averageRating} size={18} />
                      <span className="tpm-rating-text">
                        {Number(profile.averageRating).toFixed(1)} ({profile.totalReviews} review{profile.totalReviews !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="tpm-info-grid">
                {profile.primary_contact && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">Phone</span>
                    <span className="tpm-value">{profile.primary_contact}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">Email</span>
                    <span className="tpm-value">{profile.email}</span>
                  </div>
                )}
                {profile.city && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">City</span>
                    <span className="tpm-value">{profile.city}</span>
                  </div>
                )}
                {profile.state && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">State</span>
                    <span className="tpm-value">{profile.state}</span>
                  </div>
                )}
                {profile.gst_number && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">GST No.</span>
                    <span className="tpm-value">{profile.gst_number}</span>
                  </div>
                )}
                {profile.years_of_experience != null && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">Experience</span>
                    <span className="tpm-value">{profile.years_of_experience} yr{profile.years_of_experience !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {profile.fleet_size != null && (
                  <div className="tpm-info-item">
                    <span className="tpm-label">Fleet Size</span>
                    <span className="tpm-value">{profile.fleet_size} vehicles</span>
                  </div>
                )}
              </div>

              {/* Truck types */}
              {profile.truck_types && profile.truck_types.length > 0 && (
                <div className="tpm-section">
                  <div className="tpm-section-title">Vehicle Types</div>
                  <div className="tpm-tags">
                    {profile.truck_types.map((t, i) => (
                      <span key={i} className="tpm-tag">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Services */}
              {profile.services_offered && profile.services_offered.length > 0 && (
                <div className="tpm-section">
                  <div className="tpm-section-title">Services Offered</div>
                  <div className="tpm-tags">
                    {profile.services_offered.map((s, i) => (
                      <span key={i} className="tpm-tag tpm-tag-green">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent reviews */}
              {profile.reviews && profile.reviews.length > 0 && (
                <div className="tpm-section">
                  <div className="tpm-section-title">Recent Reviews</div>
                  <div className="tpm-reviews">
                    {profile.reviews.slice(0, 3).map((review, i) => (
                      <div key={i} className="tpm-review-card">
                        <div className="tpm-review-top">
                          <StarRating rating={review.rating} size={14} />
                          <span className="tpm-review-date">
                            {review.createdAt
                              ? new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : ''}
                          </span>
                        </div>
                        {review.comment && <p className="tpm-review-comment">{review.comment}</p>}
                        {review.customer_id && (
                          <p className="tpm-review-author">
                            — {review.customer_id.firstName} {review.customer_id.lastName}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .tpm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .tpm-modal {
          background: #fff;
          border-radius: 12px;
          width: 100%;
          max-width: 520px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .tpm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          flex-shrink: 0;
        }
        .tpm-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }
        .tpm-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
        }
        .tpm-close:hover { background: #f3f4f6; color: #111827; }
        .tpm-body {
          overflow-y: auto;
          padding: 1.5rem;
          flex: 1;
        }
        .tpm-loading, .tpm-error {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }
        .tpm-avatar-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }
        .tpm-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .tpm-avatar-placeholder {
          background: #4f46e5;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
        }
        .tpm-company-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }
        .tpm-rating-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
        }
        .tpm-rating-text {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .tpm-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }
        .tpm-info-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .tpm-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .tpm-value {
          font-size: 0.9rem;
          color: #111827;
        }
        .tpm-section {
          margin-bottom: 1.25rem;
        }
        .tpm-section-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
        .tpm-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .tpm-tag {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 0.8rem;
        }
        .tpm-tag-green {
          background: #f0fdf4;
          color: #16a34a;
          border-color: #bbf7d0;
        }
        .tpm-reviews {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .tpm-review-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 0.75rem 1rem;
        }
        .tpm-review-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .tpm-review-date {
          font-size: 0.75rem;
          color: #9ca3af;
        }
        .tpm-review-comment {
          margin: 4px 0;
          font-size: 0.875rem;
          color: #374151;
        }
        .tpm-review-author {
          margin: 0;
          font-size: 0.75rem;
          color: #6b7280;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
