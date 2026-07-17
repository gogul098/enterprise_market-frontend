import { useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/**
 * Interactive star selector — renders 5 clickable/hoverable stars.
 */
function StarSelector({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)',
        marginBottom: '6px', fontWeight: '500',
      }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '2px 1px',
              lineHeight: 1,
              transition: 'transform 0.12s ease',
              transform: active >= star ? 'scale(1.1)' : 'scale(0.9)',
              opacity: active >= star ? 1 : 0.25,
            }}
          >
            ★
          </button>
        ))}
        <span style={{
          marginLeft: '8px', fontSize: '0.8rem', color: 'var(--text-muted)',
          fontWeight: '600', minWidth: '24px',
        }}>
          {active}/5
        </span>
      </div>
    </div>
  );
}

export default function ReviewModal({ isOpen, onClose, product, showToast }) {
  const { user } = useAuth();
  const [starRating, setStarRating] = useState(5);
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [productQuality, setProductQuality] = useState(5);
  const [logisticsQuality, setLogisticsQuality] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/api/reviews', {
        buyer_id: user.user_id,
        product_id: product.product_id,
        star_rating: starRating,
        review_headline: headline,
        review_body: body,
        product_quality_rating: productQuality,
        logistics_quality_rating: logisticsQuality
      });
      showToast?.('Review submitted successfully!', 'success');
      onClose();
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', padding: '28px',
          position: 'relative',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          animation: 'fadeInUp 0.3s ease-out forwards',
        }}
      >
        {/* Close button */}
        <button onClick={onClose} style={{
          position: 'absolute', top: '14px', right: '14px',
          background: 'rgba(255,255,255,0.06)', border: 'none',
          color: 'var(--text-muted)', width: '28px', height: '28px',
          borderRadius: '50%', cursor: 'pointer', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'var(--transition-base)',
        }}>✕</button>

        {/* Header */}
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '4px', paddingRight: '32px' }}>
          Write a Review
        </h2>
        <p style={{
          color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px',
          borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px',
        }}>
          {product.product_name}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Overall Rating */}
          <StarSelector label="Overall Rating" value={starRating} onChange={setStarRating} />

          {/* Headline */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '500' }}>
              Review Title
            </label>
            <input
              type="text"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              className="input-field"
              placeholder="Sum it up in one line"
              style={{ padding: '10px 14px', fontSize: '0.88rem' }}
            />
          </div>

          {/* Body */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '500' }}>
              Your Review
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              className="input-field"
              rows="3"
              placeholder="What did you like or dislike?"
              required
              style={{ padding: '10px 14px', fontSize: '0.88rem', resize: 'none' }}
            />
          </div>

          {/* Quality Ratings Row */}
          <div style={{
            display: 'flex', gap: '20px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            border: '1px solid var(--border-glass)',
          }}>
            <div style={{ flex: 1 }}>
              <StarSelector label="Product Quality" value={productQuality} onChange={setProductQuality} />
            </div>
            <div style={{ flex: 1 }}>
              <StarSelector label="Delivery Experience" value={logisticsQuality} onChange={setLogisticsQuality} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
            style={{ marginTop: '4px', padding: '11px', fontSize: '0.88rem' }}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
