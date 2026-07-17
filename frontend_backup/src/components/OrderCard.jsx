/**
 * OrderCard — displays an order with status tracking.
 *
 * - Buyer view: read-only status badge with progress indicator.
 * - Vendor view: interactive status buttons to advance the fulfillment workflow.
 */

import { useState } from 'react';
import ReviewModal from './ReviewModal';

const STATUS_FLOW = ['pending', 'packed', 'in_transit', 'delivered'];

const STATUS_CONFIG = {
  pending:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  icon: '⏳', label: 'Pending' },
  packed:     { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '📦', label: 'Packed' },
  in_transit: { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  icon: '🚚', label: 'In Transit' },
  delivered:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: '✅', label: 'Delivered' },
  cancelled:  { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',   icon: '❌', label: 'Cancelled' },
};

export default function OrderCard({ order, role = 'Buyer', onStatusChange, onCancel, showToast }) {
  const [reviewProduct, setReviewProduct] = useState(null);

  const currentIdx = STATUS_FLOW.indexOf(order.global_status);
  const cfg = STATUS_CONFIG[order.global_status] || STATUS_CONFIG.pending;
  const isVendor = role === 'Vendor' || role === 'Admin';

  return (
    <div className="glass-card" style={{ padding: '24px', overflow: 'visible' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.4rem' }}>{cfg.icon}</span>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Order #{order.order_id}</h3>
            {order.buyer_email && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isVendor ? `Buyer: ${order.buyer_email}` : order.buyer_email}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: '600',
            background: cfg.bg,
            color: cfg.color,
            letterSpacing: '0.02em',
          }}>
            {cfg.label}
          </span>
          <span style={{
            fontSize: '1.15rem',
            fontWeight: '700',
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ₹{parseFloat(order.total_amount).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Status Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px', padding: '0 4px' }}>
        {STATUS_FLOW.map((s, i) => {
          const sCfg = STATUS_CONFIG[s];
          const isCompleted = i <= currentIdx;
          return (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                height: '4px',
                width: '100%',
                borderRadius: '2px',
                background: isCompleted ? sCfg.color : 'rgba(255,255,255,0.08)',
                transition: 'background 0.4s ease',
              }} />
              <span style={{
                fontSize: '0.68rem',
                color: isCompleted ? sCfg.color : 'var(--text-muted)',
                fontWeight: isCompleted ? '600' : '400',
                textAlign: 'center',
              }}>
                {sCfg.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Order Items */}
      <div style={{
        background: 'var(--bg-glass)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-glass)',
        padding: '12px 14px',
        marginBottom: isVendor && order.global_status !== 'delivered' ? '16px' : '0',
      }}>
        {(order.items || []).map((item, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.82rem',
            padding: '8px 0',
            color: 'var(--text-secondary)',
            borderBottom: idx < order.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div>
              <span>{item.product_name || `Product #${item.product_id}`} × {item.quantity}</span>
              {role === 'Buyer' && order.global_status === 'delivered' && (
                <button
                  onClick={() => setReviewProduct(item)}
                  style={{
                    display: 'block',
                    marginTop: '4px',
                    background: 'none',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  Write a Review
                </button>
              )}
            </div>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
              ₹{(parseFloat(item.unit_price) * item.quantity).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      {/* Vendor Status Controls */}
      {isVendor && order.global_status !== 'delivered' && order.global_status !== 'cancelled' && (
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {STATUS_FLOW.filter((_, i) => i > currentIdx).map(nextStatus => {
            const nCfg = STATUS_CONFIG[nextStatus];
            return (
              <button
                key={nextStatus}
                onClick={() => onStatusChange?.(order.order_id, nextStatus)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${nCfg.color}40`,
                  background: nCfg.bg,
                  color: nCfg.color,
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  fontFamily: 'Inter,sans-serif',
                  transition: 'var(--transition-base)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {nCfg.icon} Mark as {nCfg.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Buyer Cancel Control */}
      {!isVendor && order.global_status === 'pending' && onCancel && (
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onCancel(order.order_id)}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              background: 'rgba(244,63,94,0.1)',
              color: '#f43f5e',
              border: '1px solid rgba(244,63,94,0.2)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(244,63,94,0.2)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(244,63,94,0.1)';
            }}
          >
            Cancel Order
          </button>
        </div>
      )}

      {/* Timestamp */}
      {order.created_at && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'right' }}>
          Placed: {new Date(order.created_at).toLocaleString()}
        </p>
      )}

      {/* Review Modal */}
      <ReviewModal 
        isOpen={!!reviewProduct} 
        onClose={() => setReviewProduct(null)} 
        product={reviewProduct || {}} 
        showToast={showToast} 
      />
    </div>
  );
}
