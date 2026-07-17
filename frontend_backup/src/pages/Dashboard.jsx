import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import Navbar from '../components/Navbar.jsx';
import ProductCard from '../components/ProductCard.jsx';
import CartSidebar from '../components/CartSidebar.jsx';
import OrderCard from '../components/OrderCard.jsx';
import AdminDashboard from './AdminDashboard.jsx';

export default function Dashboard({ showToast }) {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderNotifications, setOrderNotifications] = useState([]);

  const userRole = user?.roles?.[0] || 'Buyer';
  const isVendorOrAdmin = userRole === 'Vendor' || userRole === 'Admin';

  // Vendors/Admins land on fulfillment; Buyers land on catalog
  const [activeTab, setActiveTab] = useState(isVendorOrAdmin ? 'fulfillment' : 'catalog');

  const userRef = useRef(user);
  const showToastRef = useRef(showToast);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get('/api/products');
      setProducts(res.data);
    } catch (err) {
      showToastRef.current?.('Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await axios.get('/api/orders', {
        params: { user_id: userRef.current?.user_id, role: userRef.current?.roles?.[0] || 'Buyer' },
      });
      setOrders(res.data);
    } catch (err) {
      showToastRef.current?.('Failed to load orders.', 'error');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Silent re-fetch — updates orders without showing the loading skeleton
  const silentFetchOrders = useCallback(async () => {
    try {
      const res = await axios.get('/api/orders', {
        params: { user_id: userRef.current?.user_id, role: userRef.current?.roles?.[0] || 'Buyer' },
      });
      setOrders(res.data);
    } catch (_) {}
  }, []);

  const handleCancelOrder = async (orderId) => {
    try {
      await axios.post(`/api/orders/${orderId}/cancel`, { user_id: user.user_id });
      showToastRef.current?.('Order cancelled successfully', 'success');
      silentFetchOrders(); // refresh the list without loading skeleton
    } catch (err) {
      showToastRef.current?.(err.response?.data?.detail || 'Failed to cancel order', 'error');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await axios.patch(`/api/orders/${orderId}/status`, { status: newStatus });
      showToast?.(`Order #${orderId} updated to "${newStatus}".`, 'success');
      if (res.data) {
        setOrders(prev =>
          prev.map(o =>
            Number(o.order_id) === Number(orderId) ? { ...o, global_status: res.data.global_status } : o
          )
        );
      }
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Failed to update status.', 'error');
    }
  };

  // ── WebSocket setup ───────────────────────────────────────────────────
  // Track seen order IDs to prevent duplicate notifications
  const seenOrderIds = useRef(new Set());

  useEffect(() => {
    fetchProducts();
    // Eagerly load orders for vendors so the fulfillment tab is ready
    if (userRef.current?.roles?.[0] === 'Vendor' || userRef.current?.roles?.[0] === 'Admin') {
      fetchOrders();
    }

    // Fallback to Render URL automatically when running on Vercel, to avoid Edge Network WebSocket drops
    const defaultWsHost = window.location.hostname.includes('vercel.app') 
        ? 'wss://enterprise-market-backend.onrender.com/ws/inventory' 
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/inventory`;
    const wsUrl = import.meta.env.VITE_WS_URL || defaultWsHost;
    let ws;
    let pingInterval;
    let reconnectTimeout;
    let isCleaned = false;

    const connectWs = () => {
      if (isCleaned) return;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 25000);
      };
      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'INVENTORY_UPDATE' && msg.updates) {
            setProducts(prev =>
              prev.map(p => {
                const updated = msg.updates.find(u => Number(u.product_id) === Number(p.product_id));
                return updated ? { ...p, qty_available: updated.qty_available } : p;
              })
            );
          }

          if (msg.type === 'ORDER_CREATED') {
            const o = msg.order;
            const currentUser = userRef.current;
            const currentRole = currentUser?.roles?.[0] || 'Buyer';
            const isRelevant =
              currentRole === 'Admin' ||
              (currentRole === 'Vendor' && (msg.vendor_ids || []).includes(Number(currentUser?.user_id))) ||
              (currentRole === 'Buyer' && Number(o.buyer_id) === Number(currentUser?.user_id));

            if (isRelevant) {
              // Deduplicate notifications — only show once per order_id
              if (!seenOrderIds.current.has(o.order_id)) {
                seenOrderIds.current.add(o.order_id);
                setOrderNotifications(prev => [{
                  id: Date.now(),
                  text: `🛒 New order #${o.order_id} from ${o.buyer_email} — ₹${parseFloat(o.total_amount).toLocaleString('en-IN')}`,
                }, ...prev].slice(0, 5));
              }

              // Immediately add order to state from the WS payload (instant UI)
              setOrders(prev => {
                const exists = prev.find(x => Number(x.order_id) === Number(o.order_id));
                if (exists) return prev;

                let orderItems = (o.items || []).map(i => ({
                  product_id: i.product_id,
                  product_name: i.product_name,
                  quantity: i.quantity,
                  unit_price: i.unit_price,
                }));
                if (currentRole === 'Vendor') {
                  orderItems = (o.items || [])
                    .filter(i => Number(i.vendor_id) === Number(currentUser?.user_id))
                    .map(i => ({
                      product_id: i.product_id,
                      product_name: i.product_name,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                    }));
                }
                const displayTotal = currentRole === 'Vendor'
                  ? orderItems.reduce((sum, i) => sum + parseFloat(i.unit_price) * i.quantity, 0)
                  : o.total_amount;

                return [{
                  order_id: o.order_id,
                  buyer_id: o.buyer_id,
                  buyer_email: o.buyer_email,
                  total_amount: displayTotal,
                  global_status: o.global_status,
                  created_at: o.created_at,
                  idempotency_key: '',
                  items: orderItems,
                }, ...prev];
              });

              // Background consistency re-fetch (no spinner)
              silentFetchOrders();
            }
          }

          if (msg.type === 'ORDER_STATUS_UPDATE') {
            setOrders(prev =>
              prev.map(o => {
                if (Number(o.order_id) === Number(msg.order_id)) {
                  if (msg.order) {
                    return { ...o, ...msg.order };
                  }
                  return { ...o, global_status: msg.global_status };
                }
                return o;
              })
            );
            if (Number(msg.buyer_id) === Number(userRef.current?.user_id)) {
              showToastRef.current?.(`📦 Order #${msg.order_id} status updated to: ${msg.global_status}`, 'success');
            }
          }

          if (msg.type === 'CATALOG_UPDATE') {
            fetchProducts();
          }
        } catch (e) {}
      };
      ws.onclose = () => {
        clearInterval(pingInterval);
        if (!isCleaned) reconnectTimeout = setTimeout(connectWs, 3000);
      };
    };

    connectWs();

    return () => {
      isCleaned = true;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  // Fetch orders when switching to orders/fulfillment tab
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab !== prevTabRef.current) {
      prevTabRef.current = activeTab;
      if (activeTab === 'orders' || activeTab === 'fulfillment') {
        fetchOrders();
      }
    }
  }, [activeTab, fetchOrders]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TABS = [
    { key: 'catalog', label: '📦 Catalog', show: !isVendorOrAdmin },
    { key: 'orders', label: '🛍️ My Orders', show: userRole === 'Buyer' },
    { key: 'fulfillment', label: '🚚 Fulfillment', show: isVendorOrAdmin },
    { key: 'ai-hub', label: '🤖 AI Hub', show: isVendorOrAdmin },
  ].filter(t => t.show);

  const dismissNotification = (id) => {
    setOrderNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <CartSidebar showToast={showToast} onCheckoutSuccess={() => { fetchProducts(); fetchOrders(); }} />

      {/* Live Order Notifications Banner */}
      {orderNotifications.length > 0 && isVendorOrAdmin && (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 32px 0' }}>
          {orderNotifications.map(n => (
            <div key={n.id} className="animate-fade-in-up" style={{
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.88rem',
            }}>
              <span style={{ color: 'var(--text-primary)' }}>{n.text}</span>
              <button onClick={() => dismissNotification(n.id)} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', marginLeft: '12px',
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
        {/* Tab Navigation */}
        <div className="animate-fade-in-up" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '4px', marginBottom: '28px', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.88rem',
                fontFamily: 'Inter,sans-serif',
                transition: 'var(--transition-base)',
                background: activeTab === tab.key ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === tab.key ? '#fff' : 'var(--text-muted)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ CATALOG TAB ════════════════════════════════════════════════ */}
        {activeTab === 'catalog' && (
          <>
            <div className="animate-fade-in-up" style={{ marginBottom: '32px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Product Catalog</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>{products.length} products available</p>
              </div>
              <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
                <input
                  id="product-search"
                  type="text"
                  className="input-field"
                  placeholder="Search products or SKU..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>🔍</span>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '24px' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: '380px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>No products found</p>
                <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Try adjusting your search query</p>
              </div>
            ) : (
              <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '24px' }}>
                {filtered.map(product => (
                  <ProductCard key={product.product_id} product={product} showToast={showToast} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ MY ORDERS TAB (Buyer) ═════════════════════════════════════ */}
        {activeTab === 'orders' && (
          <>
            <div className="animate-fade-in-up" style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>My Orders</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>{orders.length} order(s) placed</p>
            </div>
            {ordersLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ height: '140px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛍️</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>No orders yet</p>
                <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Start shopping from the catalog!</p>
              </div>
            ) : (
              <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {orders.map(order => (
                  <OrderCard 
                    key={order.order_id} 
                    order={order} 
                    role="Buyer" 
                    onCancel={handleCancelOrder}
                    showToast={showToast} 
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ FULFILLMENT TAB (Vendor / Admin) ══════════════════════════ */}
        {activeTab === 'fulfillment' && (
          <>
            <div className="animate-fade-in-up" style={{ marginBottom: '32px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>🚚 Fulfillment Center</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>{orders.length} order(s) to manage</p>
            </div>
            {ordersLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ height: '180px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>No orders to fulfill</p>
                <p style={{ fontSize: '0.88rem', marginTop: '8px' }}>Orders will appear here in real-time</p>
              </div>
            ) : (
              <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {orders.map(order => (
                  <OrderCard
                    key={order.order_id}
                    order={order}
                    role="Vendor"
                    onStatusChange={handleStatusChange}
                    showToast={showToast}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ AI HUB TAB (Vendor / Admin) ══════════════════════════ */}
        {activeTab === 'ai-hub' && (
          <AdminDashboard />
        )}
      </main>
    </div>
  );
}
