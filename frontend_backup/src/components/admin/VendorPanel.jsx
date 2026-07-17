import { useState, useEffect } from 'react';
import axios from 'axios';

export default function VendorPanel() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/ai/vendor-performance');
        setData(res.data);
      } catch (err) {
        setError('Failed to load Vendor Performance data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading Vendor Data...</div>;
  if (error) return <div style={{ padding: '20px', color: 'var(--accent-rose)' }}>{error}</div>;

  return (
    <div className="animate-fade-in-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
      {data.map(v => (
        <div key={v.vendor_id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{v.vendor_name}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {v.vendor_id}</div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', fontWeight: '800',
              background: v.letter_grade.startsWith('A') ? 'rgba(52,211,153,0.1)' : v.letter_grade.startsWith('B') ? 'rgba(251,191,36,0.1)' : 'rgba(251,113,133,0.1)',
              color: v.letter_grade.startsWith('A') ? 'var(--accent-emerald)' : v.letter_grade.startsWith('B') ? 'var(--accent-amber)' : 'var(--accent-rose)'
            }}>
              {v.letter_grade}
            </div>
          </div>
          
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>AI Performance Score</span>
              <span style={{ fontWeight: '700' }}>{v.performance_score ? parseFloat(v.performance_score).toFixed(2) : 'N/A'}/100</span>
            </div>
            <div style={{ height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${v.performance_score || 0}%`,
                background: v.letter_grade.startsWith('A') ? 'var(--accent-emerald)' : v.letter_grade.startsWith('B') ? 'var(--accent-amber)' : 'var(--accent-rose)',
                transition: 'width 1s ease-in-out'
              }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
