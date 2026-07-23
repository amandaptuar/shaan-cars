import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ShaanCarsLogo from './Logo';
import showroomImg from './assets/login_showroom.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      {/* Left side brand info with showrooms image background */}
      <div className="login-left-brand" style={{ backgroundImage: `url(${showroomImg})` }}>
        <div className="login-left-overlay"></div>
        
        <div className="login-left-header">
          <div className="logo-container">
            <ShaanCarsLogo size={32} />
          </div>
          <span>SHAAN CARS</span>
        </div>



        <div style={{ zIndex: 2, fontSize: '0.8rem', color: '#cbd5e1', fontWeight: '500' }}>
          &copy; {new Date().getFullYear()} Shaan Cars Private Limited. All rights reserved.
        </div>
      </div>

      {/* Right side form */}
      <div className="login-right-form">
        <div className="login-bg-blob-1"></div>
        <div className="login-bg-blob-2"></div>
        
        <div className="login-form-box">
          
          {/* Mobile Header Branding */}
          <div className="login-header-mobile">
            <div className="logo-container">
              <ShaanCarsLogo size={36} />
            </div>
            <h2>Shaan Cars CRM</h2>
            <p>Sign in to access your portal</p>
          </div>

          <h2 className="login-form-title">Welcome Back</h2>
          <p className="login-form-subtitle">Enter your enterprise credentials to access the console.</p>

          {errorMsg && (
            <div style={{ padding: '0.875rem 1rem', marginBottom: '1.5rem', background: '#fef2f2', color: '#991b1b', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
              <span style={{ color: '#dc2626', fontWeight: 'bold' }}>⚠️</span>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="premium-input-group">
              <label>Email Address</label>
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
              <div className="premium-input-wrapper" style={{ position: 'relative' }}>
                <Lock size={18} />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="premium-login-input"
                  placeholder="••••••••"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#2563EB'}
                  onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem' }}>
              <label className="custom-checkbox-container">
                <input type="checkbox" />
                <span className="checkmark"></span>
                <span>Remember me</span>
              </label>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Please contact your Super Admin to reset your enterprise password."); }} style={{ fontSize: '0.85rem', color: '#dc2626', textDecoration: 'none', fontWeight: '600' }} onMouseOver={(e) => e.target.style.textDecoration = 'underline'} onMouseOut={(e) => e.target.style.textDecoration = 'none'}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" disabled={loading} className="premium-submit-btn" style={{ marginBottom: '1.5rem' }}>
              {loading ? 'Authenticating Credentials...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: '600' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
              Secure Connection
            </span>
            <span>|</span>
            <span>Enterprise SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
