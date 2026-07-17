import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'error', onClose, duration = 5000 }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 300);
  };

  const bgColor =
    type === 'success'
      ? 'linear-gradient(135deg, #10b981, #059669)'
      : type === 'warning'
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #ef4444, #dc2626)';

  const icon =
    type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✕';

  return (
    <div
      className={exiting ? 'animate-toast-out' : 'animate-toast-in'}
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        maxWidth: '420px',
        minWidth: '320px',
      }}
    >
      <div
        style={{
          background: bgColor,
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <span
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.85rem',
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <p
          style={{
            flex: 1,
            fontSize: '0.9rem',
            fontWeight: '500',
            lineHeight: '1.5',
            color: '#fff',
          }}
        >
          {message}
        </p>
        <button
          onClick={handleClose}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: 'white',
            borderRadius: '6px',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
