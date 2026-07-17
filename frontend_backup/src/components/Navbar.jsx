import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { toggleCart, totalItems } = useCart();

  const userRole = user?.roles?.[0] || 'Buyer';
  const showCart = userRole === 'Buyer';

  const roleBadgeColor = {
    Buyer:  'badge-success',
    Vendor: 'badge-warning',
    Admin:  'badge-danger',
  };

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '0 32px',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'var(--gradient-primary)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '800',
            }}
          >
            E
          </div>
          <span
            style={{
              fontSize: '1.15rem',
              fontWeight: '700',
              letterSpacing: '-0.02em',
            }}
          >
            Enterprise<span style={{ color: 'var(--accent-indigo)' }}>Market</span>
          </span>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {user.email}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {user.roles?.map((role) => (
                  <span key={role} className={`badge ${roleBadgeColor[role] || 'badge-success'}`}>
                    {role}
                  </span>
                ))}
              </div>

              {/* Cart Button (Buyers only) */}
              {showCart && (
                <button
                  id="cart-toggle-btn"
                  onClick={toggleCart}
                  style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    transition: 'var(--transition-base)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'rgba(99,102,241,0.15)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                  }
                >
                  🛒
                  {totalItems > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: 'var(--gradient-danger)',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {totalItems}
                    </span>
                  )}
                </button>
              )}

              {/* Logout */}
              <button className="btn-outline" onClick={logout} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
