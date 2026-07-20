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
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="bg-gradient-orb orb-1"></div>
      <div className="bg-gradient-orb orb-2"></div>
      
      <div className="glass-card login-card">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div className="logo-icon" style={{ width: '56px', height: '56px', marginBottom: '1rem' }}>
            <CarFront size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Shaan Cars CRM</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Login to access your dashboard</p>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.75rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email Address / Username</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem 0.75rem 2.5rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }} 
                placeholder="employee@shaancars.com" 
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem 1rem 0.75rem 2.5rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-color)', 
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }} 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem' }}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
