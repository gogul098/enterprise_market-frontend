import Navbar from '../components/Navbar';

export default function WarehouseDashboard() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          src="/warehouse-dashboard/index.html"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: '#0f172a'
          }}
          title="Warehouse Inventory Planning Dashboard"
        />
      </div>
    </div>
  );
}
