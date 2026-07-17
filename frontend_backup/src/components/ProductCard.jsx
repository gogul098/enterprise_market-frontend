import { useCart } from '../context/CartContext.jsx';

export default function ProductCard({ product, showToast }) {
  const { addItem } = useCart();

  const stockLevel =
    product.qty_available > 20
      ? 'success'
      : product.qty_available > 5
      ? 'warning'
      : 'danger';

  const stockLabel =
    product.qty_available === 0
      ? 'Out of Stock'
      : `${product.qty_available} in stock`;

  const handleAdd = () => {
    if (product.qty_available === 0) {
      showToast?.('This product is currently out of stock.', 'warning');
      return;
    }
    addItem(product);
    showToast?.(`${product.name} added to cart!`, 'success');
  };

  return (
    <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Product Image */}
      <div
        style={{
          position: 'relative',
          height: '200px',
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'}
          alt={product.name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
          }}
        />
        {/* SKU Badge */}
        <span
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.7rem',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
          }}
        >
          {product.sku}
        </span>
      </div>

      {/* Product Info */}
      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3
          style={{
            fontSize: '1.05rem',
            fontWeight: '600',
            lineHeight: '1.3',
            letterSpacing: '-0.01em',
          }}
        >
          {product.name}
        </h3>

        {product.description && (
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </p>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Price + Stock */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ₹{parseFloat(product.price).toLocaleString('en-IN')}
            </span>
            <span className={`badge badge-${stockLevel}`}>{stockLabel}</span>
          </div>

          {/* Add to Cart */}
          <button
            id={`add-to-cart-${product.product_id}`}
            className="btn-primary"
            onClick={handleAdd}
            disabled={product.qty_available === 0}
            style={{
              width: '100%',
              padding: '11px',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {product.qty_available === 0 ? 'Sold Out' : '🛒  Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
