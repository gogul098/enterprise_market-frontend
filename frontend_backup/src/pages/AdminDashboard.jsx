import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import SentimentPanel from '../components/admin/SentimentPanel';
import InventoryPanel from '../components/admin/InventoryPanel';
import ForecastPanel from '../components/admin/ForecastPanel';
import VendorPanel from '../components/admin/VendorPanel';
import StockPanel from '../components/admin/StockPanel';
import CatalogPanel from '../components/admin/CatalogPanel';

const TABS = [
  { id: 'sentiment', label: '🧠 Sentiment Analysis' },
  { id: 'inventory', label: '📊 Inventory Planning' },
  { id: 'forecast', label: '📈 Demand Forecasting' },
  { id: 'vendor', label: '🤝 Vendor Performance' },
  { id: 'stock', label: '📦 Add Stock' },
  { id: 'catalog', label: '🛍️ Catalog' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Vendor Setup Modal State
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [warehouseCount, setWarehouseCount] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const userRole = user?.roles?.[0] || 'Buyer';
  const isVendor = userRole === 'Vendor';
  const isHoldingVendorId = isVendor ? user?.user_id : selectedVendorId;

  useEffect(() => {
    if (userRole === 'Admin') {
      const fetchVendors = async () => {
        try {
          const res = await axios.get('/api/ai/vendor-performance');
          const vendorData = res.data;
          setVendors(vendorData);
          
          if (userRole === 'Vendor') {
            const currentVendor = vendorData.find(v => v.vendor_id === String(user.user_id));
            if (currentVendor && currentVendor.warehouse_count === null) {
              setShowSetupModal(true);
            }
          }
        } catch (err) {
          console.error('Failed to load vendors list', err);
        }
      };
      fetchVendors();
    }
  }, [userRole, user?.user_id]);

  const handleVendorSetup = async (e) => {
    e.preventDefault();
    if (!warehouseCount || isNaN(warehouseCount) || parseInt(warehouseCount) <= 0) return;
    
    setSetupLoading(true);
    try {
      await axios.put(`/api/ai/vendor/setup?vendor_id=${user.user_id}`, { warehouse_count: parseInt(warehouseCount) });
      setShowSetupModal(false);
      // Update local state
      setVendors(prev => prev.map(v => v.vendor_id === String(user.user_id) ? { ...v, warehouse_count: parseInt(warehouseCount) } : v));
    } catch (err) {
      console.error('Failed to update vendor setup', err);
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
      
      {/* Vendor Setup Modal */}
      {showSetupModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', width: '100%' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', color: 'var(--accent-emerald)' }}>Welcome to AI Hub 🚀</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
              Before you start, please tell us how many warehouses you operate out of. This helps our AI optimize your logistics.
            </p>
            <form onSubmit={handleVendorSetup}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Number of Warehouses</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={warehouseCount}
                  onChange={e => setWarehouseCount(e.target.value)}
                  placeholder="e.g., 3"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', fontSize: '1rem', outline: 'none'
                  }}
                />
              </div>
              <button 
                type="submit" 
                disabled={setupLoading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald))',
                  color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem',
                  cursor: setupLoading ? 'not-allowed' : 'pointer',
                  opacity: setupLoading ? 0.7 : 1, transition: 'all 0.2s ease'
                }}
              >
                {setupLoading ? 'Saving...' : 'Save & Continue'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Control Center
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Enterprise insights and automated operations</p>
        </div>

        {userRole === 'Admin' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Filter by Vendor:</span>
            <select
              value={selectedVendorId}
              onChange={e => setSelectedVendorId(e.target.value)}
              style={{
                padding: '10px 16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                color: 'white',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Vendors</option>
              {vendors.map(v => (
                <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ 
        display: 'flex', gap: '8px', marginBottom: '32px', padding: '6px', 
        background: 'var(--bg-card)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
        {TABS.map(tab => {
          // Hide Vendor panels from Vendors
          if (userRole === 'Vendor' && tab.id === 'vendor') return null;
          // Hide Stock/Catalog panels from Admins
          if (userRole === 'Admin' && (tab.id === 'stock' || tab.id === 'catalog')) return null;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === tab.id ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === tab.id ? '0 0 20px rgba(16, 185, 129, 0.1) inset' : 'none',
                border: activeTab === tab.id ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ minHeight: '600px' }}>
        {activeTab === 'sentiment' && <SentimentPanel vendorId={isHoldingVendorId} />}
        {activeTab === 'inventory' && <InventoryPanel vendorId={isHoldingVendorId} />}
        {activeTab === 'forecast' && <ForecastPanel vendorId={isHoldingVendorId} />}
        {activeTab === 'vendor' && <VendorPanel />}
        {activeTab === 'stock' && <StockPanel vendorId={isHoldingVendorId} />}
        {activeTab === 'catalog' && <CatalogPanel vendorId={isHoldingVendorId} />}
      </div>
      
    </div>
  );
}
