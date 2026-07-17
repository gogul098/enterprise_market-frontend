import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const ROLES = [
  { value: 'Buyer',  icon: '🏷️', label: 'Buyer',  desc: 'Browse & purchase products' },
  { value: 'Vendor', icon: '🏪', label: 'Vendor', desc: 'Sell & manage fulfillment' },
  { value: 'Logistics', icon: '🚚', label: 'Logistics', desc: 'Manage logistics & deliveries' },
  { value: 'Warehouse', icon: '🏭', label: 'Warehouse', desc: 'Inventory & capacity planning' },
  { value: 'Admin',  icon: '🛡️', label: 'Admin',  desc: 'System administration' },
];

export default function LandingPage({ showToast }) {
  const { signup, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Buyer');
  const [address, setAddress] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [logisticsName, setLogisticsName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { showToast?.('Please fill in all fields.', 'warning'); return; }
    setLoading(true);
    try {
      if (isLogin) { await login(email, password); showToast?.('Welcome back!', 'success'); }
      else { await signup(email, password, selectedRole, address, vendorName); showToast?.('Account created!', 'success'); }
    } catch (err) {
      showToast?.(err.response?.data?.detail || 'Something went wrong.', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:'600px', height:'600px', borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)', top:'-200px', right:'-100px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:'500px', height:'500px', borderRadius:'50%', background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)', bottom:'-150px', left:'-100px', pointerEvents:'none' }} />
      <div className="animate-fade-in-up" style={{ width:'100%', maxWidth:'560px', margin:'0 24px', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <div style={{ width:'64px', height:'64px', background:'var(--gradient-primary)', borderRadius:'16px', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', fontWeight:'800', marginBottom:'16px', boxShadow:'0 8px 32px rgba(99,102,241,0.3)' }}>E</div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:'800', letterSpacing:'-0.03em', marginBottom:'8px' }}>Enterprise<span style={{ color:'var(--accent-indigo)' }}>Market</span></h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.92rem' }}>Premium marketplace for enterprise procurement</p>
        </div>
        <div className="glass-card" style={{ padding:'36px 32px' }}>
          <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:'var(--radius-sm)', padding:'4px', marginBottom:'28px' }}>
            <button id="login-tab" onClick={() => setIsLogin(true)} style={{ flex:1, padding:'10px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.9rem', fontFamily:'Inter,sans-serif', transition:'var(--transition-base)', background:isLogin?'var(--gradient-primary)':'transparent', color:isLogin?'#fff':'var(--text-muted)' }}>Login</button>
            <button id="signup-tab" onClick={() => setIsLogin(false)} style={{ flex:1, padding:'10px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'0.9rem', fontFamily:'Inter,sans-serif', transition:'var(--transition-base)', background:!isLogin?'var(--gradient-primary)':'transparent', color:!isLogin?'#fff':'var(--text-muted)' }}>Sign Up</button>
          </div>

          {/* Role Selection (Sign Up only) */}
          {!isLogin && (
            <div style={{ marginBottom:'22px' }}>
              <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'10px' }}>Select Your Role</label>
              <div style={{ display:'flex', flexWrap: 'wrap', gap:'8px' }}>
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    style={{
                      flex: '1 1 120px',
                      minWidth: '90px',
                      padding: '12px 8px',
                      borderRadius: 'var(--radius-sm)',
                      border: selectedRole === r.value ? '2px solid var(--accent-indigo)' : '1px solid var(--border-glass)',
                      background: selectedRole === r.value ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'var(--transition-base)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize:'1.3rem', marginBottom:'4px' }}>{r.icon}</div>
                    <div style={{ fontSize:'0.8rem', fontWeight:'600', color: selectedRole === r.value ? 'var(--accent-indigo)' : 'var(--text-primary)' }}>{r.label}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:'2px', lineHeight:'1.3' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' }}>Email Address</label>
              <input id="auth-email" type="email" className="input-field" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            
            {!isLogin && selectedRole === 'Buyer' && (
              <div>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' }}>Shipping Address (For Smart Logistics)</label>
                <input id="auth-address" type="text" className="input-field" placeholder="123 Smart Logisitics Rd, NY 10001" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            )}

            {/* Vendor / Company Name */}
            {!isLogin && selectedRole === 'Vendor' && (
              <div>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' }}>Vendor / Company Name</label>
                <input id="auth-vendor-name" type="text" className="input-field" placeholder="Acme Logistics Corp" value={vendorName} onChange={e => setVendorName(e.target.value)} required />
              </div>
            )}
            {/* Logistics Company Name */}
            {!isLogin && selectedRole === 'Logistics' && (
              <div>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' }}>Logistics Company Name</label>
                <input id="auth-logistics-name" type="text" className="input-field" placeholder="LogiCorp" value={logisticsName} onChange={e => setLogisticsName(e.target.value)} required />
              </div>
            )}

            <div>
              <label style={{ display:'block', fontSize:'0.82rem', fontWeight:'500', color:'var(--text-secondary)', marginBottom:'6px' }}>Password</label>
              <input id="auth-password" type="password" className="input-field" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} />
            </div>
            <button id="auth-submit-btn" type="submit" className="btn-primary" disabled={loading} style={{ marginTop:'8px', padding:'14px', fontSize:'1rem' }}>
              {loading ? 'Please wait...' : isLogin ? 'Login' : `Create ${selectedRole} Account`}
            </button>
          </form>
          <p style={{ textAlign:'center', marginTop:'20px', fontSize:'0.82rem', color:'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} style={{ background:'none', border:'none', color:'var(--accent-indigo)', cursor:'pointer', fontWeight:'600', fontFamily:'Inter,sans-serif', fontSize:'0.82rem' }}>
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
