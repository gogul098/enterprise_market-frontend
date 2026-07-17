import { useState, useEffect } from 'react';
import axios from 'axios';

export default function InventoryPanel({ vendorId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/ai/inventory-planning', {
          params: vendorId ? { vendor_id: vendorId } : {}
        });
        setData(res.data);
      } catch (err) {
        setError('Failed to load Inventory Planning data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendorId]);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading Inventory Data...</div>;
  if (error) return <div style={{ padding: '20px', color: 'var(--accent-rose)' }}>{error}</div>;

  return (
    <div className="animate-fade-in-up">
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Product</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Warehouse</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Available Stock</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Reserved</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Reorder Point</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={`${row.product_id}-${row.warehouse}`} style={{ borderBottom: idx < data.length - 1 ? '1px solid var(--border-glass)' : 'none' }}>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ fontWeight: '500' }}>{row.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.sku}</div>
                </td>
                <td style={{ padding: '16px 20px', color: 'var(--text-secondary)' }}>{row.warehouse}</td>
                <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{row.qty_available}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{row.qty_reserved}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>{row.reorder_point}</td>
                <td style={{ padding: '16px 20px' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    background: row.status === 'HEALTHY' ? 'rgba(52,211,153,0.1)' : row.status === 'WARNING' ? 'rgba(251,191,36,0.1)' : 'rgba(251,113,133,0.1)',
                    color: row.status === 'HEALTHY' ? 'var(--accent-emerald)' : row.status === 'WARNING' ? 'var(--accent-amber)' : 'var(--accent-rose)'
                  }}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
