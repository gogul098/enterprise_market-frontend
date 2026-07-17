import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ForecastPanel({ vendorId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/ai/demand-forecasting', {
          params: vendorId ? { vendor_id: vendorId } : {}
        });
        setData(res.data);
      } catch (err) {
        setError('Failed to load Forecast data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendorId]);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading Forecast Data...</div>;
  if (error) return <div style={{ padding: '20px', color: 'var(--accent-rose)' }}>{error}</div>;

  return (
    <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
      {data.map(p => (
        <div key={p.product_id} style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${p.recommendation === 'RESTOCK NOW' ? 'var(--accent-rose)' : 'var(--border-glass)'}`,
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{p.name}</h3>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>{p.sku}</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Current Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{p.current_stock}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Velocity / Day</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--accent-amber)' }}>{p.velocity_daily.toFixed(1)}</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Days Remaining</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: p.days_remaining <= 14 ? 'var(--accent-rose)' : p.days_remaining <= 30 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
              {p.days_remaining}
            </span>
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
             <span style={{
                display: 'inline-block',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                background: p.recommendation === 'OPTIMAL' ? 'rgba(52,211,153,0.1)' : p.recommendation === 'RESTOCK SOON' ? 'rgba(251,191,36,0.1)' : 'rgba(251,113,133,0.1)',
                color: p.recommendation === 'OPTIMAL' ? 'var(--accent-emerald)' : p.recommendation === 'RESTOCK SOON' ? 'var(--accent-amber)' : 'var(--accent-rose)'
              }}>
                {p.recommendation}
              </span>
          </div>
        </div>
      ))}
    </div>
  );
}
