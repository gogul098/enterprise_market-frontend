import { useState, useEffect } from 'react';
import axios from 'axios';

export default function SentimentPanel({ vendorId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/ai/sentiment-analysis', {
          params: vendorId ? { vendor_id: vendorId } : {}
        });
        setData(res.data);
      } catch (err) {
        setError('Failed to load Sentiment Analysis data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vendorId]);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading AI Sentiment Data...</div>;
  if (error) return <div style={{ padding: '20px', color: 'var(--accent-rose)' }}>{error}</div>;
  if (data.length === 0) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>No products found.</div>;

  let totalScored = 0;
  let sumScores = 0;
  data.forEach(p => {
    totalScored += p.total_reviews;
    sumScores += p.average_sentiment * p.total_reviews;
  });
  const globalAvg = totalScored > 0 ? (sumScores / totalScored).toFixed(2) : 0;

  return (
    <div className="animate-fade-in-up">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Reviews Analyzed</div>
          <div style={{ fontSize: '2rem', fontWeight: '800' }}>{totalScored}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Global Average Sentiment</div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: globalAvg >= 0.6 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>{globalAvg}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {data.map(p => (
          <div key={p.product_id} style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '4px' }}>{p.name}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Avg Sentiment: <span style={{ fontWeight: 'bold', color: p.average_sentiment >= 0.6 ? 'var(--accent-emerald)' : p.average_sentiment <= 0.4 ? 'var(--accent-rose)' : 'var(--accent-amber)' }}>{p.average_sentiment.toFixed(2)}</span></span>
                <span>{p.total_reviews} Reviews</span>
              </div>
              
              <div style={{ marginTop: '16px', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: `${p.positive_ratio * 100}%`, background: 'var(--accent-emerald)' }} />
                <div style={{ width: `${(1 - p.positive_ratio - p.negative_ratio) * 100}%`, background: 'var(--accent-amber)' }} />
                <div style={{ width: `${p.negative_ratio * 100}%`, background: 'var(--accent-rose)' }} />
              </div>
            </div>
            
            <div style={{ padding: '20px', maxHeight: '300px', overflowY: 'auto' }}>
              {p.recent_reviews.map((r, i) => (
                <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < p.recent_reviews.length - 1 ? '1px dashed var(--border-glass)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--accent-amber)', fontSize: '0.9rem' }}>{'★'.repeat(r.star_rating)}</span>
                    {r.ai_sentiment_score !== null && (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', borderRadius: '12px',
                        background: r.ai_sentiment_score >= 0.6 ? 'rgba(52,211,153,0.1)' : r.ai_sentiment_score <= 0.4 ? 'rgba(251,113,133,0.1)' : 'rgba(251,191,36,0.1)',
                        color: r.ai_sentiment_score >= 0.6 ? 'var(--accent-emerald)' : r.ai_sentiment_score <= 0.4 ? 'var(--accent-rose)' : 'var(--accent-amber)'
                      }}>
                        AI: {r.ai_sentiment_score.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>"{r.review_body}"</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
