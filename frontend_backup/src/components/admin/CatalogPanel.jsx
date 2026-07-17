import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function CatalogPanel({ vendorId }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    description: '',
    warehouse_id: '1',
    initial_qty: '0'
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        price: parseFloat(formData.price),
        description: formData.description,
        warehouse_id: parseInt(formData.warehouse_id),
        initial_qty: parseInt(formData.initial_qty)
      };

      const url = vendorId ? `/api/ai/products?vendor_id=${vendorId}` : `/api/ai/products?vendor_id=${user.user_id}`;
      const res = await axios.post(url, payload);
      
      setMessage('Product successfully added to catalog with initial stock!');
      
      // Reset form
      setFormData({
        name: '', sku: '', price: '', description: '',
        warehouse_id: '1', initial_qty: '0'
      });
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fade-in 0.4s ease-out' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '10px', color: 'var(--accent-emerald)' }}>
          🛍️ Add Product to Catalog
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Create a new product and initialize its stock levels in one step. Demand forecasting will be handled automatically by the AI model.
        </p>
        
        {error && (
          <div style={{ padding: '12px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444' }}>
            {error}
          </div>
        )}
        
        {message && (
          <div style={{ padding: '12px', marginBottom: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* Section 1: Product Basics */}
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--accent-cyan)' }}>1. Product Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Product Name *</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>SKU *</label>
                <input required type="text" name="sku" value={formData.sku} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Price ($) *</label>
                <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="3" style={{...inputStyle, resize: 'vertical'}} />
            </div>
          </div>

          {/* Section 2: Initial Stock */}
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--accent-cyan)' }}>2. Initial Stock</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Warehouse ID *</label>
                <input required type="number" name="warehouse_id" value={formData.warehouse_id} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Initial Quantity *</label>
                <input required type="number" name="initial_qty" value={formData.initial_qty} onChange={handleChange} style={inputStyle} />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              padding: '16px', borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald))',
              color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}
          >
            {loading ? 'Processing...' : 'Create Product'}
          </button>

        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'white', fontSize: '1rem', outline: 'none'
};
