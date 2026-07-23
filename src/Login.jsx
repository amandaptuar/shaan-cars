import React, { useState } from 'react';
import { CarFront, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    // Master Admin Bypass (Testing)
    if (email === 'admin' && password === 'shaan123') {
      localStorage.setItem('loggedInUser', JSON.stringify({
        id: 'master-admin',
        full_name: 'Shaan Master Admin',
        role: 'Super_Admin',
        photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop'
      }));
      navigate('/admin-dashboard');
      return;
    }

    // Custom Database Login (Checks 'employees' table for assigned_password)
    const { data: userData, error } = await supabase
      .from('employees')
      .select('*')
      .eq('email', email)
      .eq('assigned_password', password)
      .single();

    if (!error && userData) {
      setLoading(false);
      localStorage.setItem('loggedInUser', JSON.stringify(userData));
      if (userData.role === 'Super_Admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/employee-dashboard');
      }
      return;
    }

    // Check mechanics table
    const { data: mechanicData, error: mechError } = await supabase
      .from('mechanics')
      .select('*')
      .eq('email', email)
      .eq('assigned_password', password)
      .single();

    setLoading(false);

    if (!mechError && mechanicData) {
      localStorage.setItem('loggedInUser', JSON.stringify({ ...mechanicData, role: 'Mechanic' }));
      navigate('/mechanic-dashboard');
      return;
    }

    setErrorMsg('Invalid email or password. Please try again.');
  };

  return (
    <div className="login-page-wrapper">
      {/* Left side brand info (hidden on mobile) */}
      <div className="login-left-brand">
        <div className="login-left-header">
          <div className="logo-circle">
            <CarFront size={24} />
          </div>
          <span>SHAAN CARS</span>
        </div>

        <div className="login-left-content">
          <h1>Precision Control.<br />Peak Performance.</h1>
          <p>The ultimate enterprise CRM control center managing sales pipelines, employee performance, and inventory logistics across Arena, Nexa, and True Value divisions.</p>
          
          <div className="login-stats-grid">
            <div className="login-stat-card">
              <div className="num">3</div>
              <div className="label">Divisions</div>
            </div>
            <div className="login-stat-card">
              <div className="num">24/7</div>
              <div className="label">Real-time Sync</div>
            </div>
            <div className="login-stat-card">
              <div className="num">100%</div>
              <div className="label">Security Lock</div>
            </div>
          </div>
        </div>

        <div style={{ zIndex: 2, fontSize: '0.8rem', color: '#475569', fontWeight: '500' }}>
          &copy; {new Date().getFullYear()} Shaan Cars Private Limited. All rights reserved.
        </div>
      </div>

      {/* Right side form */}
      <div className="login-right-form">
        <div className="login-form-box">
          
          {/* Mobile Header Branding */}
          <div className="login-header-mobile">
            <div className="logo-circle">
              <CarFront size={28} />
            </div>
            <h2>Shaan Cars CRM</h2>
            <p>Sign in to access your portal</p>
          </div>

          <h2 className="login-form-title">Welcome Back</h2>
          <p className="login-form-subtitle">Enter your enterprise credentials to access the console.</p>

          {errorMsg && (
            <div style={{ padding: '0.875rem 1rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
              <span style={{ color: '#ef4444', fontWeight: 'bold' }}>⚠️</span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="premium-input-group">
              <label>Email Address / Username</label>
              <div className="premium-input-wrapper">
                <Mail size={18} />
                <input 
                  type="text" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="premium-login-input"
                  placeholder="employee@shaancars.com" 
                />
              </div>
            </div>

            <div className="premium-input-group" style={{ marginBottom: '2rem' }}>
              <label>Security Password</label>
              <div className="premium-input-wrapper">
                <Lock size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="premium-login-input"
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="premium-submit-btn">
              {loading ? 'Authenticating Credentials...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
