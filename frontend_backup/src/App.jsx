import { useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LogisticsDashboard from './pages/LogisticsDashboard.jsx';
import WarehouseDashboard from './pages/WarehouseDashboard.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  return (
    <div className="app-root" style={{ minHeight: '100vh' }}>
      {user ? (
        user?.roles?.[0] === 'Logistics' ? (
          <LogisticsDashboard showToast={showToast} />
        ) : user?.roles?.[0] === 'Warehouse' ? (
          <WarehouseDashboard showToast={showToast} />
        ) : (
          <Dashboard showToast={showToast} />
        )
      ) : (
        <LandingPage showToast={showToast} />
      )}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
