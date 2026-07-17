import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import axios from 'axios';
import PaymentModal from './PaymentModal.jsx';

export default function CartSidebar({ showToast, onCheckoutSuccess }) {
  const { user } = useAuth();
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalAmount, clearCart } = useCart();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePayClick = () => {
    if (items.length === 0) {
      showToast?.('Your cart is empty.', 'warning');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmCheckout = async () => {
    setShowConfirm(false);
    setIsProcessing(true);

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await axios.post('/api/orders/checkout', {
        buyer_id: user.user_id,
        idempotency_key: idempotencyKey,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      });

      showToast?.(
        `Order #${res.data.order_id} placed successfully! Total: ₹${parseFloat(res.data.total_amount).toLocaleString('en-IN')}`,
        'success'
      );
      clearCart();
      closeCart();
      onCheckoutSuccess?.();
    } catch (err) {
      if (err.response?.status === 400) {
        showToast?.(
          'An item in your cart sold out before checkout could complete.',
          'error'
        );
        onCheckoutSuccess?.(); // Refresh products to show updated stock
      } else {
        showToast?.(
          err.response?.data?.detail || 'Checkout failed. Please try again.',
          'error'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        className="animate-fade-in"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 200,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Sidebar Panel */}
      <div
        className="animate-slide-in"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '420px',
          maxWidth: '90vw',
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-glass)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
            🛒 Shopping Cart
          </h2>
          <button
            onClick={closeCart}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-secondary)',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 0',
                color: 'var(--text-muted)',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
              <p style={{ fontSize: '0.95rem' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.82rem', marginTop: '8px' }}>
                Add some products to get started
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    padding: '14px',
                    background: 'var(--bg-glass)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  {/* Thumbnail */}
                  <img
                    src={item.image_url || 'https://via.placeholder.com/60'}
                    alt={item.name}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.name}
                    </p>
                    <p
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--accent-indigo)',
                        fontWeight: '600',
                        marginTop: '2px',
                      }}
                    >
                      ₹{parseFloat(item.price).toLocaleString('en-IN')}
                    </p>
                    {/* Quantity Controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '8px',
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {/* Remove + Line Total */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                    }}
                  >
                    <button
                      onClick={() => removeItem(item.product_id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-rose)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                      }}
                    >
                      Remove
                    </button>
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      ₹{(parseFloat(item.price) * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            style={{
              padding: '24px',
              borderTop: '1px solid var(--border-glass)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Total */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Total</span>
              <span
                style={{
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Pay Button */}
            <button
              id="pay-btn"
              className="btn-success"
              onClick={handlePayClick}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isProcessing ? (
                <>
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Processing...
                </>
              ) : (
                <>💳  Pay Now</>
              )}
            </button>

            <button
              className="btn-outline"
              onClick={clearCart}
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>

      {/* ── Realistic Mock Payment Gateway ────────────────────────────── */}
      {showConfirm && (
        <PaymentModal
          totalAmount={totalAmount}
          onCancel={() => setShowConfirm(false)}
          onSuccess={handleConfirmCheckout}
        />
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
