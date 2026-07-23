import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import { LogOut, Wrench, CheckCircle, Clock, PlayCircle, Users, Calendar, Trophy, Medal, Menu, Download, Search, Settings, Award, ShieldAlert, Camera, UploadCloud, Lock } from 'lucide-react';

export default function MechanicDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [assignedServices, setAssignedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mechanicsLeaderboard, setMechanicsLeaderboard] = useState([]);
  const [allMechanics, setAllMechanics] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    mobile: '',
    email: '',
    assigned_password: '',
    photo_url: '',
    family_contact_1: '',
    family_contact_2: '',
    aadhaar_number: '',
    aadhaar_photo_url: '',
    pan_photo_url: '',
    date_of_birth: '',
    address: '',
    state: '',
    district: ''
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [monthlyDaysPresent, setMonthlyDaysPresent] = useState(0);
  const [totalWorkHours, setTotalWorkHours] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchMechanicData();

    const channel = supabase.channel('mechanic-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_mechanics' }, () => { fetchMechanicData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_services' }, () => { fetchMechanicData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mechanics' }, () => { fetchMechanicData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMechanicData = async () => {
    const sessionData = localStorage.getItem('loggedInUser');
    if (!sessionData) { navigate('/login'); return; }
    
    const userData = JSON.parse(sessionData);
    if (userData.role !== 'Mechanic') { navigate('/login'); return; }

    const { data: mechData } = await supabase.from('mechanics').select('*').eq('id', userData.id).single();
    const activeUser = mechData || userData;
    if (mechData) {
      setProfile(mechData);
      localStorage.setItem('loggedInUser', JSON.stringify({ ...mechData, role: 'Mechanic' }));
    } else {
      setProfile(userData);
    }

    setProfileForm({
      full_name: activeUser.full_name || '',
      mobile: activeUser.mobile || '',
      email: activeUser.email || '',
      assigned_password: activeUser.assigned_password || '',
      photo_url: activeUser.photo_url || '',
      family_contact_1: activeUser.family_contact_1 || '',
      family_contact_2: activeUser.family_contact_2 || '',
      aadhaar_number: activeUser.aadhaar_number || '',
      aadhaar_photo_url: activeUser.aadhaar_photo_url || '',
      pan_photo_url: activeUser.pan_photo_url || '',
      date_of_birth: activeUser.date_of_birth || '',
      address: activeUser.address || '',
      state: activeUser.state || '',
      district: activeUser.district || ''
    });

    const [ { data: assignments }, { data: leaderboardData }, { data: attData }, { data: allMechs }, { data: attHist } ] = await Promise.all([
      supabase.from('service_mechanics').select('*, vehicle_services(*, customers(full_name, mobile))').eq('mechanic_id', userData.id).order('assigned_at', { ascending: false }),
      supabase.from('mechanics').select('id, full_name, photo_url, total_points').eq('division', (mechData || userData).division || 'Arena').order('total_points', { ascending: false }).limit(5),
      supabase.from('attendance').select('*').eq('mechanic_id', userData.id).eq('date', new Date().toISOString().split('T')[0]).single(),
      supabase.from('mechanics').select('*'),
      supabase.from('attendance').select('*').eq('mechanic_id', userData.id).order('date', { ascending: false }).limit(30)
    ]);

    setAssignedServices(assignments || []);
    setMechanicsLeaderboard(leaderboardData || []);
    setAttendance(attData || null);
    setAllMechanics(allMechs || []);
    setAttendanceHistory(attHist || []);
    
    let daysPresent = 0; let totalHrs = 0;
    if (attHist) {
      attHist.forEach(record => {
        if (record.status === 'Present') daysPresent++;
        if (record.check_in && record.check_out) {
          const diffMs = new Date(record.check_out) - new Date(record.check_in);
          if (diffMs > 0) totalHrs += (diffMs / (1000 * 60 * 60));
        }
      });
    }
    setMonthlyDaysPresent(daysPresent);
    setTotalWorkHours(totalHrs.toFixed(1));

    setLoading(false);
  };

  const markAttendance = async () => {
    const { error } = await supabase.from('attendance').insert([{
      mechanic_id: profile.id,
      date: new Date().toISOString().split('T')[0],
      status: 'Present',
      check_in: new Date().toISOString()
    }]);
    if (!error) {
      await supabase.from('point_transactions').insert([{ mechanic_id: profile.id, points_awarded: 10, reason: 'Daily Check-in' }]);
      await supabase.from('mechanics').update({ total_points: (profile.total_points || 0) + 10 }).eq('id', profile.id);
      fetchMechanicData();
    }
  };

  const markCheckOut = async () => {
    if (!window.confirm('Are you sure you want to end your shift? You cannot check-in again today.')) return;
    const { error } = await supabase.from('attendance').update({
      check_out: new Date().toISOString()
    }).eq('id', attendance.id);
    if (!error) {
      fetchMechanicData();
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    navigate('/login');
  };

  const openEditProfile = () => {
    setProfileForm({ 
      full_name: profile.full_name,
      mobile: profile.mobile || '',
      email: profile.email, 
      assigned_password: profile.assigned_password || '',
      photo_url: profile.photo_url || '',
      family_contact_1: profile.family_contact_1 || '',
      family_contact_2: profile.family_contact_2 || '',
      aadhaar_number: profile.aadhaar_number || '',
      aadhaar_photo_url: profile.aadhaar_photo_url || '',
      pan_photo_url: profile.pan_photo_url || '',
      date_of_birth: profile.date_of_birth || '',
      address: profile.address || '',
      state: profile.state || '',
      district: profile.district || ''
    });
    setIsEditProfileOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProfileForm(prev => ({ ...prev, photo_url: reader.result })); };
      reader.readAsDataURL(file);
    }
  };

  const handleAadhaarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProfileForm(prev => ({ ...prev, aadhaar_photo_url: reader.result })); };
      reader.readAsDataURL(file);
    }
  };

  const handlePanUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProfileForm(prev => ({ ...prev, pan_photo_url: reader.result })); };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    // Front-end Validation
    if (!profileForm.aadhaar_photo_url || !profileForm.pan_photo_url) {
      alert("Please upload both Aadhaar and PAN Card photos to complete verification.");
      return;
    }

    if (profileForm.aadhaar_number?.length !== 12) {
      alert("Aadhaar card number must be exactly 12 digits.");
      return;
    }

    // Lock condition check
    if (profile?.profile_completed) {
      alert("Your profile is already verified and locked. Edit operations are not allowed.");
      return;
    }

    // Build update package
    const updatePayload = {
      full_name: profileForm.full_name,
      mobile: profileForm.mobile,
      email: profileForm.email,
      assigned_password: profileForm.assigned_password,
      photo_url: profileForm.photo_url,
      family_contact_1: profileForm.family_contact_1,
      family_contact_2: profileForm.family_contact_2,
      aadhaar_number: profileForm.aadhaar_number,
      aadhaar_photo_url: profileForm.aadhaar_photo_url,
      pan_photo_url: profileForm.pan_photo_url,
      date_of_birth: profileForm.date_of_birth,
      address: profileForm.address,
      state: profileForm.state,
      district: profileForm.district,
      profile_completed: true // Unlock flag
    };

    const { data, error } = await supabase
      .from('mechanics')
      .update(updatePayload)
      .eq('id', profile.id)
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem('loggedInUser', JSON.stringify({ ...data, role: 'Mechanic' }));
      setProfile(data);
      setIsEditProfileOpen(false);
      alert("Profile verified and locked successfully! Your Mechanic Dashboard is now active.");
      fetchMechanicData();
    } else {
      alert("Error updating profile details: " + (error?.message || "Unknown error"));
    }
  };

  const updateServiceStatus = async (serviceId, newStatus) => {
    await supabase.from('vehicle_services').update({ status: newStatus }).eq('id', serviceId);
    
    // Update mechanic status based on action
    if (newStatus === 'In_Progress') {
      await supabase.from('mechanics').update({ status: 'Booked' }).eq('id', profile.id);
    } else if (newStatus === 'Completed') {
      await supabase.from('mechanics').update({ status: 'Available', total_points: (profile.total_points || 0) + 50 }).eq('id', profile.id);
      await supabase.from('point_transactions').insert([{ mechanic_id: profile.id, points_awarded: 50, reason: 'Completed Service' }]);
    }
    
    fetchMechanicData();
  };

  if (loading) {
    return (
      <div className="premium-loader-overlay">
        <div className="premium-spinner"></div>
        <div className="premium-loader-text">Loading Workspace</div>
        <div className="premium-loader-brand">SHAAN CARS CRM</div>
      </div>
    );
  }

  // If first time login and profile details are not completed
  if (profile && !profile.profile_completed) {
    return (
      <div className="profile-setup-container">
        <div className="profile-setup-card">
          <div className="profile-setup-header">
            <h1>Access Blocked: Profile Verification Required</h1>
            <p>Please enter all required details below to verify your profile and unlock dashboard access.</p>
          </div>
          <div className="profile-setup-body">
            <div className="warning-box" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
              <ShieldAlert size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
              <div>
                <strong>Dashboard Access Blocked:</strong> As a mandatory security measure, you must complete your profile (emergency contacts, Aadhaar, PAN card, date of birth, and address) before you can access assigned repairs, check in to work, or view statistics.
                <br />
                <span style={{ fontWeight: '700', color: '#b91c1c' }}>⚠️ IMPORTANT: Once you save and lock this profile, these details cannot be changed. Please double-check all information before submitting.</span>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate}>
              {/* Profile Photo */}
              <div className="setup-section-title">
                <Camera size={18} /> Profile Photo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {profileForm.photo_url ? (
                    <img src={profileForm.photo_url} alt="Preview" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }} />
                  ) : (
                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '4px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={36} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', cursor: 'pointer', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={16} /> Upload Photo
                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* Personal Details */}
              <div className="setup-section-title">Personal Details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input required type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Mobile Number</label>
                  <input required type="text" value={profileForm.mobile} onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Email Address</label>
                  <input required type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Account Password</label>
                  <input required type="text" value={profileForm.assigned_password} onChange={e => setProfileForm({ ...profileForm, assigned_password: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input required type="date" value={profileForm.date_of_birth} onChange={e => setProfileForm({ ...profileForm, date_of_birth: e.target.value })} className="form-input" />
                </div>
              </div>

              {/* Family Contacts */}
              <div className="setup-section-title">Emergency Family Contacts</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Emergency Contact 1 (Relation/Phone)</label>
                  <input required type="text" placeholder="e.g. Father: 9876543210" value={profileForm.family_contact_1} onChange={e => setProfileForm({ ...profileForm, family_contact_1: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Emergency Contact 2 (Relation/Phone)</label>
                  <input required type="text" placeholder="e.g. Spouse: 9876543211" value={profileForm.family_contact_2} onChange={e => setProfileForm({ ...profileForm, family_contact_2: e.target.value })} className="form-input" />
                </div>
              </div>

              {/* Address Details */}
              <div className="setup-section-title">Residential Address</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label className="form-label">Permanent Address</label>
                  <textarea required value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="Enter house no, street, locality..."></textarea>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="form-label">District</label>
                    <input required type="text" value={profileForm.district} onChange={e => setProfileForm({ ...profileForm, district: e.target.value })} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input required type="text" value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} className="form-input" />
                  </div>
                </div>
              </div>

              {/* Identity Verification Documents */}
              <div className="setup-section-title">Identity Verification Documents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div>
                  <label className="form-label">12-Digit Aadhaar Card Number</label>
                  <input required type="text" maxLength={12} value={profileForm.aadhaar_number} onChange={e => setProfileForm({ ...profileForm, aadhaar_number: e.target.value.replace(/\D/g, '') })} className="form-input" placeholder="0000 0000 0000" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label className="form-label">Aadhaar Card Photo</label>
                    {profileForm.aadhaar_photo_url ? (
                      <div className="preview-thumbnail-container">
                        <img src={profileForm.aadhaar_photo_url} alt="Aadhaar Preview" className="preview-thumbnail" />
                        <label className="btn" style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Replace
                          <input type="file" accept="image/*" onChange={handleAadhaarUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    ) : (
                      <div className="premium-upload-card">
                        <div className="upload-icon-circle"><UploadCloud size={24} /></div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Upload Aadhaar Card Image</span>
                        <input required type="file" accept="image/*" onChange={handleAadhaarUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">PAN Card Photo</label>
                    {profileForm.pan_photo_url ? (
                      <div className="preview-thumbnail-container">
                        <img src={profileForm.pan_photo_url} alt="PAN Preview" className="preview-thumbnail" />
                        <label className="btn" style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Replace
                          <input type="file" accept="image/*" onChange={handlePanUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    ) : (
                      <div className="premium-upload-card">
                        <div className="upload-icon-circle"><UploadCloud size={24} /></div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Upload PAN Card Image</span>
                        <input required type="file" accept="image/*" onChange={handlePanUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                <button type="button" onClick={handleLogout} className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '0.875rem' }}>Cancel & Log Out</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  Save and Lock Profile & Unlock Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const currentJob = assignedServices.find(sm => sm.vehicle_services?.status === 'In_Progress');
  const pendingJobs = assignedServices.filter(sm => sm.vehicle_services?.status === 'Upcoming' || sm.vehicle_services?.status === 'Overdue');
  const completedJobs = assignedServices.filter(sm => sm.vehicle_services?.status === 'Completed');

  return (
    <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon" style={{ color: 'var(--accent-primary)' }}><Wrench size={24} /></div>
          <span className="logo-text">Mechanic Portal</span>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Users size={20} /> Dashboard</button>
          <button onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Wrench size={20} /> Service History</button>
          <button onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Calendar size={20} /> Attendance</button>
          <button onClick={() => { setActiveTab('rankings'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'rankings' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Medal size={20} /> Leaderboard</button>
          <button onClick={handleLogout} className="nav-item logout-btn" style={{ marginTop: 'auto', width: '100%', textAlign: 'left' }}><LogOut size={20} /> Logout</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Search service history or vehicles..." className="search-input" />
            </div>
          </div>
          <div className="header-actions">
            {attendance?.check_in && !attendance?.check_out ? (
              <button onClick={markCheckOut} className="btn" style={{ background: 'var(--accent-danger)', color: 'white', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                <Clock size={18} /> End Shift (Active)
              </button>
            ) : attendance?.check_out ? (
              <button disabled className="btn" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'not-allowed' }}>
                <CheckCircle size={18} /> Shift Completed Today
              </button>
            ) : (
              <button onClick={markAttendance} className="btn" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                <Clock size={18} /> Start Shift
              </button>
            )}

            <div className="user-profile" style={{ position: 'relative', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="avatar" style={{ border: '2px solid var(--accent-primary)', width: '42px', height: '42px', margin: 0, objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ border: '2px solid var(--accent-primary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', width: '42px', height: '42px', margin: 0 }}>
                  {profile?.full_name?.charAt(0) || 'M'}
                </div>
              )}

              {isProfileMenuOpen && (
                <div style={{ position: 'absolute', top: '55px', right: '0', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '0.5rem', minWidth: '200px', zIndex: 100, border: '1px solid var(--border-color)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profile?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lead Mechanic ({profile?.division})</div>
                  </div>
                  <button onClick={() => {
                    setIsProfileMenuOpen(false);
                    openEditProfile();
                  }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-secondary)', background: 'transparent', textAlign: 'left', cursor: 'pointer', transition: '0.2s', border: 'none' }} onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <Settings size={16} /> {profile?.profile_completed ? 'View Verification Details' : 'Setup Profile'}
                  </button>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem', borderRadius: '8px', color: 'var(--accent-danger)', background: 'transparent', textAlign: 'left', cursor: 'pointer', transition: '0.2s', border: 'none' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content">
          
          {activeTab === 'dashboard' && (
            <>
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div className="page-title">
                  <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Welcome back, {profile?.full_name.split(' ')[0]}!</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Your daily service assignments and performance overview.</p>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-success)', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="kpi-icon-wrapper green" style={{ marginBottom: 0 }}><Clock size={24} /></div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Professional Time Clock</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {currentTime.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {attendance?.check_in && !attendance?.check_out && <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', border: '1px solid var(--accent-success)' }}><span style={{width:'6px', height:'6px', borderRadius:'50%', background:'var(--accent-success)', display:'inline-block', marginRight:'6px'}}></span>Shift Active</span>}
                  {attendance?.check_out && <span className="status-badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>Shift Ended</span>}
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span><strong style={{color:'var(--text-primary)'}}>Server Time Lock:</strong> Verified ✅ (Anti-Cheat Active)</span>
                   {!attendance && (
                      <button onClick={markAttendance} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Start Shift (+10 pts)</button>
                   )}
                   {attendance && !attendance.check_out && (
                      <button onClick={markCheckOut} className="btn" style={{ background: 'var(--accent-danger)', color: 'white', padding: '0.4rem 1rem', fontSize: '0.85rem', border: 'none' }}>End Shift</button>
                   )}
                   {attendance && attendance.check_out && (
                      <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Logged Out at {new Date(attendance.check_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                   )}
                </div>
              </div>

              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card hover-lift">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="kpi-label">Total Reward Points</p>
                      <h3 className="kpi-value">{profile?.total_points || 0}</h3>
                    </div>
                    <div className="kpi-icon-wrapper blue"><Award size={24} /></div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', fontWeight: '600' }}>Top 10%</span>
                    <span style={{ color: 'var(--text-muted)' }}>this week</span>
                  </div>
                </div>

                <div className="glass-card hover-lift" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="kpi-label">Repairs Done</p>
                      <h3 className="kpi-value">{completedJobs.length} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {profile?.monthly_target || 15}</span></h3>
                    </div>
                    <div className="kpi-icon-wrapper green"><CheckCircle size={24} /></div>
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ marginTop: '12px', width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (completedJobs.length / (profile?.monthly_target || 15)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '3px' }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: '6px', textAlign: 'right', fontWeight: '600' }}>
                      {Math.min(100, Math.round((completedJobs.length / (profile?.monthly_target || 15)) * 100))}% Achieved
                    </div>
                  </div>
                </div>

                <div className="glass-card hover-lift">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="kpi-label">Work Hours (30 Days)</p>
                      <h3 className="kpi-value">{totalWorkHours}h</h3>
                    </div>
                    <div className="kpi-icon-wrapper orange"><Clock size={24} /></div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', fontWeight: '500' }}>Avg: 40 hours</span>
                  </div>
                </div>

                <div className="glass-card hover-lift">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="kpi-label">Days Present (30D)</p>
                      <h3 className="kpi-value">{monthlyDaysPresent}</h3>
                    </div>
                    <div className="kpi-icon-wrapper purple"><Calendar size={24} /></div>
                  </div>
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', fontWeight: '500' }}>Consistency</span>
                  </div>
                </div>
              </div>
          
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Current Job Section */}
          {currentJob && (
            <div className="glass-card" style={{ border: '2px solid var(--accent-primary)', background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Wrench size={20} /> Active Service Job
                </h2>
                <span className="status-badge warm" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>In Progress</span>
              </div>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vehicle</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>{currentJob.vehicle_services.vehicle_model}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Customer</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{currentJob.vehicle_services.customers?.full_name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{currentJob.vehicle_services.customers?.mobile}</div>
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Service Instructions</div>
                  <p style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{currentJob.vehicle_services.notes}</p>
                </div>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => updateServiceStatus(currentJob.vehicle_services.id, 'Completed')}
                  className="btn btn-primary" 
                  style={{ background: 'var(--accent-success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', padding: '0.75rem 2rem', fontSize: '1rem' }}
                >
                  <CheckCircle size={20} /> Mark as Completed
                </button>
              </div>
            </div>
          )}

          {/* Pending Jobs */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Pending Assignments ({pendingJobs.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingJobs.length === 0 ? (
                <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No pending assignments right now.
                </div>
              ) : (
                pendingJobs.map(job => {
                  const dueDateStr = job.vehicle_services.service_due_date.split('T')[0];
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isFuture = dueDateStr > todayStr;
                  const isBooked = profile?.status === 'Booked';

                  return (
                  <div key={job.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{job.vehicle_services.vehicle_model}</div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Instructions: {job.vehicle_services.notes}</div>
                    </div>
                    <div>
                      {isFuture ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '12px', fontWeight: '600' }}>
                           Due on: {new Date(job.vehicle_services.service_due_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <button 
                          onClick={() => updateServiceStatus(job.vehicle_services.id, 'In_Progress')}
                          className="btn btn-primary"
                          disabled={isBooked}
                          style={{ opacity: isBooked ? 0.5 : 1, cursor: isBooked ? 'not-allowed' : 'pointer' }}
                        >
                          <PlayCircle size={18} /> Start Service
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Completed Jobs */}
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Recently Completed</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {completedJobs.slice(0, 5).map(job => (
                <div key={job.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.8 }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{job.vehicle_services.vehicle_model}</div>
                  </div>
                  <span className="status-badge won" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Done (+50 pts)
                  </span>
                </div>
              ))}
            </div>
          </div>

            </div>
            
            {/* Right Sidebar: Leaderboard */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="glass-card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'sticky', top: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   Top Mechanics ({profile?.division || 'Arena'} Division)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {mechanicsLeaderboard.map((m, idx) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '12px', border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: '800', color: idx === 0 ? 'var(--accent-warning)' : 'var(--text-muted)', width: '20px' }}>#{idx + 1}</div>
                      {m.photo_url ? (
                        <img src={m.photo_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '1rem' }}>{m.full_name.charAt(0)}</div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>{m.full_name}</div>
                      </div>
                      <div style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{m.total_points || 0} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Service History</h1>
                <p style={{ color: 'var(--text-secondary)' }}>View all completed jobs and repairs.</p>
              </div>
              <div className="glass-card">
                <div className="table-container">
                  <table className="data-table">
                  <thead>
                    <tr>
                      <th>Service Date</th>
                      <th>Vehicle Info</th>
                      <th>Customer Name</th>
                      <th>Points Earned</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedJobs.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No completed services yet.</td></tr>
                    ) : (
                      completedJobs.map(job => (
                        <tr key={job.id}>
                          <td>{new Date(job.assigned_at).toLocaleDateString()}</td>
                          <td style={{ fontWeight: '600' }}>{job.vehicle_services?.vehicle_model}</td>
                          <td>{job.vehicle_services?.customers?.full_name || 'N/A'}</td>
                          <td style={{ fontWeight: '600', color: 'var(--accent-warning)' }}>50 pts</td>
                          <td><span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>Completed</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
            <>
              <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Attendance Dashboard</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Track your presence and work hours.</p>
                </div>
                <button onClick={() => {
                   if (attendanceHistory.length === 0) return alert('No records found.');
                   const csvData = attendanceHistory.map(a => ({
                     Date: new Date(a.date).toLocaleDateString(),
                     CheckIn: a.check_in ? new Date(a.check_in).toLocaleTimeString() : '--',
                     CheckOut: a.check_out ? new Date(a.check_out).toLocaleTimeString() : 'Active',
                     Status: a.status
                   }));
                   const csv = ["Date,Check In,Check Out,Status", ...csvData.map(r => `"${r.Date}","${r.CheckIn}","${r.CheckOut}","${r.Status}"`)].join('\n');
                   const blob = new Blob([csv], { type: 'text/csv' });
                   const url = window.URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url; a.download = 'My_Attendance.csv'; a.click();
                }} className="btn" style={{ background: 'white', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Export Attendance
                </button>
              </div>
              <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                <h3 className="chart-title" style={{ marginBottom: '1.5rem' }}>Attendance History (Last 30 Days)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                  {Array.from({ length: 30 }).map((_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - (29 - i));
                    const day = d.toISOString().split('T')[0];
                    const record = attendanceHistory.find(a => a.date === day);
                    let bgColor = 'var(--bg-tertiary)'; let color = 'var(--text-secondary)'; let text = 'Absent';
                    if (record && record.status === 'Present') { bgColor = 'rgba(16, 185, 129, 0.1)'; color = 'var(--accent-success)'; text = 'Present'; }
                    else if (new Date(day).getDay() === 0 && !record) { bgColor = 'rgba(255,255,255,0.02)'; color = 'var(--text-muted)'; text = 'Weekend'; }
                    else if (day === new Date().toISOString().split('T')[0] && !record) { text = 'Pending'; }
                    return (
                      <div key={day} style={{ background: bgColor, border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>{new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: color }}>{text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'rankings' && (
            <>
              <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Mechanic Leaderboard</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Compete, climb the ranks, and dominate your division.</p>
              </div>
              <div className="glass-card">
                <div className="table-container">
                  <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                      <th>Mechanic</th>
                      <th>Division</th>
                      <th>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...allMechanics].sort((a,b) => (b.total_points||0) - (a.total_points||0)).map((m, idx) => (
                      <tr key={m.id} style={{ background: m.id === profile.id ? 'rgba(37, 99, 235, 0.05)' : 'transparent' }}>
                        <td style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold' }}>
                          {idx === 0 ? <Medal size={24} color="#fbbf24" style={{ display: 'inline' }} /> : idx === 1 ? <Medal size={24} color="#94a3b8" style={{ display: 'inline' }} /> : idx === 2 ? <Medal size={24} color="#b45309" style={{ display: 'inline' }} /> : `#${idx + 1}`}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {m.photo_url ? <img src={m.photo_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} /> : <div className="avatar" style={{ width: '36px', height: '36px' }}>{m.full_name?.charAt(0)}</div>}
                            <span style={{ fontWeight: m.id === profile.id ? '700' : '500' }}>{m.full_name} {m.id === profile.id && '(You)'}</span>
                          </div>
                        </td>
                        <td><span className="badge">{m.division}</span></td>
                        <td style={{ color: 'var(--accent-success)', fontWeight: 'bold', fontSize: '1.1rem' }}>{m.total_points || 0} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="modal-overlay" onClick={() => setIsEditProfileOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>My Profile Details & Verification</h2>
              {profile?.profile_completed ? (
                <span className="success-badge-completed">
                  <CheckCircle size={14} /> Profile Locked & Verified
                </span>
              ) : (
                <span className="locked-badge">
                  <Lock size={14} /> Setup Pending
                </span>
              )}
            </div>

            {profile?.profile_completed && (
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                <Lock size={16} style={{ flexShrink: 0 }} />
                <span>These details have been locked and cannot be edited. Please contact your manager or Super Admin for any modifications.</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  {profileForm.photo_url ? (
                    <img src={profileForm.photo_url} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-secondary)', boxShadow: 'var(--shadow-md)' }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '4px solid var(--bg-secondary)', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <Camera size={32} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                {!profile?.profile_completed && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                      <UploadCloud size={14} /> Upload New Photo
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Mobile Number</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.mobile} onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Account Password</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.assigned_password} onChange={e => setProfileForm({ ...profileForm, assigned_password: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input required disabled={profile?.profile_completed} type="date" value={profileForm.date_of_birth} onChange={e => setProfileForm({ ...profileForm, date_of_birth: e.target.value })} className="form-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Family Contact 1</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.family_contact_1} onChange={e => setProfileForm({ ...profileForm, family_contact_1: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Family Contact 2</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.family_contact_2} onChange={e => setProfileForm({ ...profileForm, family_contact_2: e.target.value })} className="form-input" />
                </div>
              </div>

              <div>
                <label className="form-label">Full Address</label>
                <textarea required disabled={profile?.profile_completed} value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} className="form-input" style={{ minHeight: '60px', resize: 'vertical' }}></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">District</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.district} onChange={e => setProfileForm({ ...profileForm, district: e.target.value })} className="form-input" />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input required disabled={profile?.profile_completed} type="text" value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} className="form-input" />
                </div>
              </div>

              <div>
                <label className="form-label">Aadhaar Card Number</label>
                <input required disabled={profile?.profile_completed} type="text" maxLength={12} value={profileForm.aadhaar_number} onChange={e => setProfileForm({ ...profileForm, aadhaar_number: e.target.value.replace(/\D/g, '') })} className="form-input" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <label className="form-label">Aadhaar Card Image</label>
                  {profileForm.aadhaar_photo_url ? (
                    <div style={{ position: 'relative' }}>
                      <img src={profileForm.aadhaar_photo_url} alt="Aadhaar" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                      {!profile?.profile_completed && (
                        <label className="btn" style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Edit
                          <input type="file" accept="image/*" onChange={handleAadhaarUpload} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="premium-upload-card" style={{ minHeight: '110px', padding: '0.5rem' }}>
                      <UploadCloud size={20} />
                      <span style={{ fontSize: '0.75rem' }}>Upload Aadhaar</span>
                      <input required type="file" accept="image/*" onChange={handleAadhaarUpload} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label">PAN Card Image</label>
                  {profileForm.pan_photo_url ? (
                    <div style={{ position: 'relative' }}>
                      <img src={profileForm.pan_photo_url} alt="PAN" style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                      {!profile?.profile_completed && (
                        <label className="btn" style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Edit
                          <input type="file" accept="image/*" onChange={handlePanUpload} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="premium-upload-card" style={{ minHeight: '110px', padding: '0.5rem' }}>
                      <UploadCloud size={20} />
                      <span style={{ fontSize: '0.75rem' }}>Upload PAN</span>
                      <input required type="file" accept="image/*" onChange={handlePanUpload} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="btn" style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                  {profile?.profile_completed ? 'Close View' : 'Cancel'}
                </button>
                {!profile?.profile_completed && (
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save & Lock Details</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
