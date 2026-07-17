import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function StockPanel({ vendorId }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stockData, setStockData] = useState([]);

  useEffect(() => {
    fetchStockData();
    fetchProducts();
  }, [vendorId]);

  const fetchStockData = async () => {
    try {
      const url = vendorId ? `/api/ai/inventory-planning?vendor_id=${vendorId}` : '/api/ai/inventory-planning';
      const res = await axios.get(url);
      setStockData(res.data);
    } catch (err) {
      console.error('Failed to load stock data', err);
    }
  };

  const fetchProducts = async () => {
    // We'll use the stock data to get the list of products for the dropdown since the API returns them
    try {
        const url = vendorId ? `/api/ai/inventory-planning?vendor_id=${vendorId}` : '/api/ai/inventory-planning';
        const res = await axios.get(url);
        // Deduplicate products in case they exist in multiple warehouses
        const uniqueProducts = [];
        const seenIds = new Set();
        res.data.forEach(item => {
            if (!seenIds.has(item.product_id)) {
                seenIds.add(item.product_id);
                uniqueProducts.push({
                    id: item.product_id,
                    name: item.name,
                    sku: item.sku
                });
            }
        });
        setProducts(uniqueProducts);
        if (uniqueProducts.length > 0) {
            setSelectedProduct(uniqueProducts[0].id.toString());
        }
    } catch (err) {
        console.error('Failed to load products for stock panel', err);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
      setError('Please select a product and enter a valid positive quantity.');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        product_id: parseInt(selectedProduct),
        warehouse_id: 1, // Defaulting to main warehouse for now
        quantity: parseInt(quantity)
      };
      
      const url = vendorId ? `/api/ai/add-stock?vendor_id=${vendorId}` : '/api/ai/add-stock';
      const res = await axios.post(url, payload);
      
      setMessage(res.data.message);
      setQuantity('');
      fetchStockData(); // Refresh the table
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add stock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: 'fade-in 0.4s ease-out' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', alignItems: 'start' }}>
        
        {/* Add Stock Form */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', color: 'var(--accent-emerald)' }}>
            📦 Add New Stock
          </h2>
          <form onSubmit={handleAddStock} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {products.length === 0 && <option value="">No products found...</option>}
                {products.map(p => (
                  <option key={p.id} value={p.id} style={{ background: '#1a1a2e' }}>
                    [{p.sku}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Quantity to Add</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>

            {error && (
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}
            
            {message && (
              <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', color: '#10b981', fontSize: '0.9rem' }}>
                {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || products.length === 0}
              style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald))',
                color: 'white',
                border: 'none',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: (loading || products.length === 0) ? 'not-allowed' : 'pointer',
                opacity: (loading || products.length === 0) ? 0.7 : 1,
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Processing...' : 'Add to Inventory'}
            </button>
          </form>
        </div>

        {/* Current Stock Table */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Current Inventory Levels</span>
            <span style={{ fontSize: '0.9rem', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
              {stockData.length} items
            </span>
          </h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '500' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '500' }}>Warehouse</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '500' }}>Available Qty</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '500' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stockData.map(item => (
                  <tr key={`${item.product_id}-${item.warehouse}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: '500' }}>{item.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>SKU: {item.sku}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {item.warehouse}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: item.status === 'CRITICAL' ? '#ef4444' : 'white' }}>
                      {item.qty_available.toLocaleString()}
                    </td>
                    <td style={{ padding: '16px 12px', textAlign: 'center' }}>
                      {item.status === 'HEALTHY' && <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>HEALTHY</span>}
                      {item.status === 'WARNING' && <span style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>WARNING</span>}
                      {item.status === 'CRITICAL' && <span style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>CRITICAL</span>}
                    </td>
                  </tr>
                ))}
                {stockData.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                      No inventory records found. Add stock to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
