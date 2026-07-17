import { useState, useEffect } from 'react';

export default function PaymentModal({ totalAmount, onCancel, onSuccess }) {
  const [step, setStep] = useState('idle'); // idle -> processing -> success
  const [progressMsg, setProgressMsg] = useState('');
  
  // Form State
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  // Simple validation
  useEffect(() => {
    if (cardNum.length >= 16 && expiry.length >= 5 && cvv.length >= 3 && name.trim().length > 0) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  }, [cardNum, expiry, cvv, name]);

  const handlePay = () => {
    if (!isFormValid) return;
    
    setStep('processing');
    setProgressMsg('Initiating Secure Connection...');

    // Simulate realistic payment gateway delays
    setTimeout(() => setProgressMsg('Authenticating Card Details...'), 800);
    setTimeout(() => setProgressMsg('Contacting Bank...'), 1600);
    setTimeout(() => setProgressMsg('Processing Payment...'), 2400);
    
    setTimeout(() => {
      setStep('success');
      // Trigger the real checkout API call after a short success delay
      setTimeout(() => {
        onSuccess();
      }, 1000);
    }, 3200);
  };

  const handleCardFormat = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNum(formatted.substring(0, 19));
  };

  const handleExpiryFormat = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setExpiry(val.substring(0, 5));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="glass-card animate-fade-in-up" style={{
        width: '420px',
        maxWidth: '90%',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.15)'
      }}>
        
        {step === 'idle' && (
          <>
            <button 
              onClick={onCancel}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '1.2rem', cursor: 'pointer'
              }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Secure Checkout</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Complete your payment of <strong style={{ color: 'var(--text-primary)' }}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Cardholder Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', fontSize: '0.95rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Card Number</label>
                <input 
                  type="text" 
                  value={cardNum}
                  onChange={handleCardFormat}
                  placeholder="0000 0000 0000 0000"
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', fontSize: '0.95rem', letterSpacing: '1px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Expiry</label>
                  <input 
                    type="text" 
                    value={expiry}
                    onChange={handleExpiryFormat}
                    placeholder="MM/YY"
                    style={{
                      width: '100%', padding: '12px', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '0.95rem', textAlign: 'center'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>CVV</label>
                  <input 
                    type="password" 
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    placeholder="***"
                    style={{
                      width: '100%', padding: '12px', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: '0.95rem', textAlign: 'center', letterSpacing: '3px'
                    }}
                  />
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={!isFormValid}
                style={{
                  marginTop: '12px',
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  background: isFormValid ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.05)',
                  color: isFormValid ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s'
                }}
              >
                Pay ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </button>
              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔒 Secured by SystemSiege Payments</span>
              </div>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)',
              animation: 'spin 1s linear infinite', margin: '0 auto 24px'
            }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '8px' }}>Processing Payment</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{progressMsg}</p>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }} className="animate-fade-in-up">
            <div style={{ 
              width: '70px', height: '70px', borderRadius: '50%', 
              background: 'rgba(52, 211, 153, 0.1)', color: '#34d399',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', margin: '0 auto 24px',
              border: '2px solid rgba(52, 211, 153, 0.3)'
            }}>
              ✓
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px', color: '#34d399' }}>Payment Successful!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Your order is being placed...</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
