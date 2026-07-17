import Navbar from '../components/Navbar.jsx';

export default function LogisticsDashboard() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src="/logistics-map/index.html"
          title="Smart Route Recommendation"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
        />
      </div>
    </div>
  );
}
