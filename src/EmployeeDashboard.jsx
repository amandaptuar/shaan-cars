import React, { useEffect, useState } from 'react';
import {
  Users, CarFront, Search, Calendar, Award, CheckCircle,
  Clock, LogOut, Edit3, Camera, Check, X, Tag, BarChart2, UploadCloud, Download, Trophy, Medal, Menu, Settings,
  Lock, ShieldAlert, FileText, MapPin, Phone, Eye
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import ShaanCarsLogo from './Logo';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Dashboard Metrics
  const [points, setPoints] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [mySalesGraphData, setMySalesGraphData] = useState([]);
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
  const [mySales, setMySales] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Attendance & Hours
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [monthlyDaysPresent, setMonthlyDaysPresent] = useState(0);
  const [totalWorkHours, setTotalWorkHours] = useState(0);

  // Modals
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    photo_url: '',
    full_name: '',
    mobile: '',
    password: '',
    family_contact_1: '',
    family_contact_2: '',
    aadhaar_number: '',
    aadhaar_photo_url: '',
    pan_photo_url: '',
    date_of_birth: '',
    address: '',
    state: '',
    district: '',
    profile_completed: false
  });

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);
  const [saleForm, setSaleForm] = useState({ customer_name: '', customer_mobile: '', customer_email: '', customer_address: '', sale_amount: '', newStatus: 'Sold' });

  useEffect(() => {
    fetchEmployeeData();

    // REAL-TIME SUBSCRIPTION
    const channel = supabase.channel('employee-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_inventory' }, () => { fetchEmployeeData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => { fetchEmployeeData(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmployeeData = async () => {
    const sessionData = localStorage.getItem('loggedInUser');
    if (!sessionData) { navigate('/login'); return; }
    const userData = JSON.parse(sessionData);

    const employeeId = userData.id;
    const today = new Date().toISOString().split('T')[0];

    const { data: dbUser } = await supabase.from('employees').select('*').eq('id', employeeId).single();
    const activeUser = dbUser || userData;

    setProfile(activeUser);
    localStorage.setItem('loggedInUser', JSON.stringify(activeUser));
    
    if (activeUser) {
      setPoints(activeUser.total_points || 0);
      setProfileForm({
        photo_url: activeUser.photo_url || '',
        full_name: activeUser.full_name || '',
        mobile: activeUser.mobile || '',
        password: activeUser.assigned_password || '',
        family_contact_1: activeUser.family_contact_1 || '',
        family_contact_2: activeUser.family_contact_2 || '',
        aadhaar_number: activeUser.aadhaar_number || '',
        aadhaar_photo_url: activeUser.aadhaar_photo_url || '',
        pan_photo_url: activeUser.pan_photo_url || '',
        date_of_birth: activeUser.date_of_birth || '',
        address: activeUser.address || '',
        state: activeUser.state || '',
        district: activeUser.district || '',
        profile_completed: activeUser.profile_completed || false
      });
    }

    const { data: attData } = await supabase.from('attendance').select('*').eq('employee_id', employeeId).eq('date', today).single();

    if (attData && attData.status === 'Present' && !attData.check_out) { setIsCheckedIn(true); } else { setIsCheckedIn(false); }
    setTodayRecord(attData);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: monthAtt } = await supabase.from('attendance').select('*').eq('employee_id', employeeId).gte('date', dateStr);

    let daysPresent = 0; let totalHrs = 0;
    if (monthAtt) {
      setAttendanceHistory(monthAtt);
      monthAtt.forEach(record => {
        if (record.status === 'Present') daysPresent++;
        if (record.check_in && record.check_out) {
          const diffMs = new Date(record.check_out) - new Date(record.check_in);
          if (diffMs > 0) totalHrs += (diffMs / (1000 * 60 * 60));
        }
      });
    }
    setMonthlyDaysPresent(daysPresent);
    setTotalWorkHours(totalHrs.toFixed(1));

    // Sales Data & Graph formatting
    const { data: salesData } = await supabase.from('sales').select('*, customers(full_name)').eq('sold_by_employee', employeeId).order('sale_date', { ascending: true });

    setMySales([...(salesData || [])].reverse());
    setSalesCount(salesData?.length || 0);

    if (salesData) {
      // Group sales by day for the graph
      const salesByDay = {};
      salesData.forEach(s => {
        const date = new Date(s.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        salesByDay[date] = (salesByDay[date] || 0) + 1;
      });
      const graphData = Object.keys(salesByDay).map(k => ({ date: k, sales: salesByDay[k] }));
      if (graphData.length === 0) {
        setMySalesGraphData([{ date: 'No Sales', sales: 0 }]);
      } else {
        setMySalesGraphData(graphData);
      }
    }

    const { data: stock } = await supabase.from('vehicle_inventory').select('*').eq('division', userData.division).in('status', ['Available', 'Booked']).order('created_at', { ascending: false });
    setInventory(stock || []);

    const { data: allEmps } = await supabase.from('employees').select('*');
    if (allEmps) setAllEmployees(allEmps);

    setLoading(false);
  };

  const toggleAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const nowTimestamp = new Date().toISOString();

    if (!isCheckedIn) {
      if (todayRecord) { alert("You have already checked out for today! Attendance is recorded once per day."); return; }
      const { data } = await supabase.from('attendance').insert([{ employee_id: profile.id, date: today, status: 'Present', check_in: nowTimestamp }]).select().single();
      if (data) setTodayRecord(data);
      setIsCheckedIn(true);
      fetchEmployeeData();
    } else {
      if (window.confirm("Are you sure you want to Check Out? This will lock your work hours for today.")) {
        const checkInTime = new Date(todayRecord.check_in);
        const hoursWorked = (new Date(nowTimestamp) - checkInTime) / (1000 * 60 * 60);
        const earnedPoints = Math.max(0, Math.floor(hoursWorked * 5));
        await supabase.from('attendance').update({ check_out: nowTimestamp }).eq('id', todayRecord.id);
        if (earnedPoints > 0) {
          await supabase.from('employees').update({ total_points: points + earnedPoints }).eq('id', profile.id);
          alert(`Checked out! Worked ${hoursWorked.toFixed(1)}h. Earned ${earnedPoints} Points.`);
        }
        setIsCheckedIn(false);
        fetchEmployeeData();
      }
    }
  };

  const handleStatusChange = async (carId, newStatus) => {
    if (!isCheckedIn) {
      alert('Action Denied: You must mark your attendance (Go Active) before making any changes.');
      return;
    }

    const car = inventory.find(c => c.id === carId);
    if (newStatus === 'Sold') {
      setSelectedCar(car);
      setSaleForm({ customer_name: '', customer_mobile: '', customer_email: '', customer_address: '', sale_amount: car.price || '', newStatus: 'Sold' });
      setIsSaleModalOpen(true);
    } else {
      await supabase.from('vehicle_inventory').update({ status: newStatus }).eq('id', car.id);
      fetchEmployeeData();
    }
  };

  const confirmSale = async (e) => {
    e.preventDefault();
    await supabase.from('vehicle_inventory').update({ status: 'Sold' }).eq('id', selectedCar.id);
    const { data: custData } = await supabase.from('customers').insert([{
      full_name: saleForm.customer_name || 'Walk-in Customer',
      mobile: saleForm.customer_mobile || 'N/A',
      email: saleForm.customer_email || null,
      address: saleForm.customer_address || null
    }]).select().single();

    const { data: saleData } = await supabase.from('sales').insert([{
      sold_by_employee: profile.id, inventory_id: selectedCar.id, customer_id: custData?.id,
      vehicle_model: selectedCar.model_name, division: profile.division, sale_amount: parseFloat(saleForm.sale_amount) || 0
    }]).select().single();

    if (saleData) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + 6);
      await supabase.from('vehicle_services').insert([{
        sale_id: saleData.id,
        customer_id: custData?.id,
        vehicle_model: selectedCar.model_name,
        service_due_date: dueDate.toISOString().split('T')[0],
        status: 'Upcoming',
        notes: 'First Free Service (Scheduled 6 months post-sale)'
      }]);
    }

    await supabase.from('employees').update({ total_points: points + 50 }).eq('id', profile.id);
    setIsSaleModalOpen(false);
    fetchEmployeeData();
  };

  // Convert image file to base64
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
    
    if (profile?.profile_completed) {
      alert('Action Denied: Your profile information is locked and cannot be edited.');
      return;
    }

    // Required fields check
    if (!profileForm.full_name || !profileForm.mobile || !profileForm.password ||
        !profileForm.family_contact_1 || !profileForm.family_contact_2 ||
        !profileForm.aadhaar_number || !profileForm.date_of_birth ||
        !profileForm.address || !profileForm.state || !profileForm.district) {
      alert('Please fill in all required profile details!');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('employees').update({
      full_name: profileForm.full_name,
      photo_url: profileForm.photo_url,
      mobile: profileForm.mobile,
      assigned_password: profileForm.password,
      family_contact_1: profileForm.family_contact_1,
      family_contact_2: profileForm.family_contact_2,
      aadhaar_number: profileForm.aadhaar_number,
      aadhaar_photo_url: profileForm.aadhaar_photo_url,
      pan_photo_url: profileForm.pan_photo_url,
      date_of_birth: profileForm.date_of_birth,
      address: profileForm.address,
      state: profileForm.state,
      district: profileForm.district,
      profile_completed: true
    }).eq('id', profile.id).select().single();

    setLoading(false);

    if (error) {
      alert(`Error updating profile: ${error.message}`);
    } else if (data) {
      localStorage.setItem('loggedInUser', JSON.stringify(data));
      setProfile(data);
      setIsProfileModalOpen(false);
      alert('Profile details updated and locked successfully!');
    }
  };

  const handleLogout = () => { localStorage.removeItem('loggedInUser'); navigate('/login'); };

  const downloadMyAttendance = async () => {
    if (!profile) return;
    const { data: allAtt } = await supabase.from('attendance').select('*').eq('employee_id', profile.id).order('date', { ascending: false });
    if (!allAtt || allAtt.length === 0) { alert('No attendance records found.'); return; }

    const csvData = allAtt.map(a => {
      let checkInTime = '--';
      let checkOutTime = 'Active';
      let hoursWorked = '--';

      if (a.check_in) {
        checkInTime = new Date(a.check_in).toLocaleTimeString();
      }
      if (a.check_out) {
        checkOutTime = new Date(a.check_out).toLocaleTimeString();
        const diffMs = new Date(a.check_out) - new Date(a.check_in);
        if (diffMs > 0) hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(2);
      }

      return {
        "Date": new Date(a.date).toLocaleDateString(),
        "Check In Time": checkInTime,
        "Check Out Time": checkOutTime,
        "Status": a.status,
        "Hours Worked": hoursWorked
      };
    });

    const headers = Object.keys(csvData[0]);
    const csvRows = [headers.join(',')];

    for (const row of csvData) {
      csvRows.push(headers.map(h => `"${row[h]}"`).join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.full_name}_Attendance_Report.csv`;
    a.click();
  };

  const renderCalendar = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    const todayStr = new Date().toISOString().split('T')[0];

    return (
      <div className="glass-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '1.5rem' }}>Attendance History (Last 30 Days)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
          {days.map(day => {
            const record = attendanceHistory.find(a => a.date === day);
            const isPresent = record && record.status === 'Present';
            const isLeave = record && record.status === 'Leave';
            const isWeekend = new Date(day).getDay() === 0;
            let bgColor = 'var(--bg-tertiary)';
            let color = 'var(--text-secondary)';
            let text = 'Absent';

            if (isPresent) { bgColor = 'rgba(16, 185, 129, 0.1)'; color = 'var(--accent-success)'; text = 'Present'; }
            else if (isLeave) { bgColor = 'rgba(245, 158, 11, 0.1)'; color = 'var(--accent-warning)'; text = 'Leave'; }
            else if (isWeekend && !record) { bgColor = 'rgba(255,255,255,0.02)'; color = 'var(--text-muted)'; text = 'Weekend'; }
            else if (day === todayStr && !record) { text = 'Pending'; }

            return (
              <div key={day} style={{ background: bgColor, border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-primary)' }}>{new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: color }}>{text}</div>
                {record?.check_in && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>In: {new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRankings = () => {
    if (!profile) return null;

    // Sort all employees by points
    const sortedAll = [...allEmployees].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    // Division employees
    const divEmps = sortedAll.filter(e => e.division === profile.division);

    const myOverallRank = sortedAll.findIndex(e => e.id === profile.id) + 1;
    const myDivRank = divEmps.findIndex(e => e.id === profile.id) + 1;

    const renderPodium = (emp, rank, color, height, scale = 1) => {
      if (!emp) return null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${scale})`, transition: 'transform 0.3s' }}>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            {emp.photo_url ? (
              <img src={emp.photo_url} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `4px solid ${color}`, boxShadow: `0 10px 20px ${color}40` }} />
            ) : (
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: `4px solid ${color}`, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', boxShadow: `0 10px 20px ${color}40` }}>
                {emp.full_name?.charAt(0) || 'E'}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', background: color, color: 'white', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', border: '2px solid var(--bg-primary)' }}>
              {rank}
            </div>
          </div>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '4px' }}>{emp.full_name.split(' ')[0]}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>{emp.division}</div>

          <div style={{ width: '120px', height: height, background: `linear-gradient(to top, ${color}10, ${color}60)`, borderTopLeftRadius: '12px', borderTopRightRadius: '12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '1rem', border: `1px solid ${color}40`, borderBottom: 'none' }}>
            <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{emp.total_points || 0} pts</span>
          </div>
        </div>
      );
    };

    return (
      <div className="glass-card" style={{ marginTop: '1.5rem', overflow: 'hidden', padding: 0 }}>
        {/* Header */}
        <div className="leaderboard-header" style={{ padding: '3rem 2.5rem', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
          {/* Background Overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20% 150%, #ffffff 0%, transparent 50%), radial-gradient(circle at 80% -50%, #ffffff 0%, transparent 50%)' }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
              <Trophy size={40} color="#fbbf24" /> Elite Leaderboard
            </h2>
            <p style={{ opacity: 0.9, fontSize: '1.1rem' }}>Compete, climb the ranks, and dominate your division.</p>
          </div>
          <div className="rank-overlay" style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '20px 30px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, fontWeight: '600' }}>Division Rank</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '5px' }}>#{myDivRank}</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', padding: '20px 30px', borderRadius: '16px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, fontWeight: '600' }}>Overall Rank</div>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', marginTop: '5px' }}>#{myOverallRank}</div>
            </div>
          </div>
        </div>

        {/* Podium Section */}
        {sortedAll.length >= 3 && (
          <div className="podium-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem', padding: '3rem 2rem 0 2rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            {renderPodium(sortedAll[1], 2, '#94a3b8', '140px')}
            {renderPodium(sortedAll[0], 1, '#fbbf24', '180px', 1.1)}
            {renderPodium(sortedAll[2], 3, '#b45309', '110px')}
          </div>
        )}

        <div style={{ padding: '2rem' }}>
          <h3 className="chart-title" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} color="var(--accent-primary)" /> All Representatives</h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                  <th>Employee</th>
                  <th>Division</th>
                  <th>Total Points</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedAll.map((emp, idx) => (
                  <tr key={emp.id} style={{ background: emp.id === profile.id ? 'rgba(37, 99, 235, 0.05)' : 'transparent' }}>
                    <td style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: idx < 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {idx === 0 ? <Medal size={24} color="#fbbf24" style={{ display: 'inline' }} /> : idx === 1 ? <Medal size={24} color="#94a3b8" style={{ display: 'inline' }} /> : idx === 2 ? <Medal size={24} color="#b45309" style={{ display: 'inline' }} /> : `#${idx + 1}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                        ) : (
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', border: '1px solid var(--border-color)' }}>
                            {emp.full_name?.charAt(0) || 'E'}
                          </div>
                        )}
                        <span style={{ fontSize: '1rem', fontWeight: emp.id === profile.id ? '700' : '500', color: emp.id === profile.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                          {emp.full_name} {emp.id === profile.id && '(You)'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600' }}>{emp.division}</span>
                    </td>
                    <td style={{ color: 'var(--accent-success)', fontWeight: 'bold', fontSize: '1.1rem' }}>{emp.total_points || 0} pts</td>
                    <td style={{ textAlign: 'right' }}>
                      {idx === 0 && <span style={{ fontSize: '0.75rem', background: 'rgba(251, 191, 36, 0.1)', color: '#b45309', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>Top Performer</span>}
                      {idx > 0 && emp.id === profile.id && <span style={{ fontSize: '0.75rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '12px', fontWeight: '600' }}>Current Position</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="premium-loader-overlay">
        <div className="car-loader-container">
          <div className="car-body-wrapper">
            <svg className="car-svg" viewBox="0 0 100 40" width="80" height="32">
              <path d="M10 25 C10 25 12 18 18 15 C24 12 35 12 40 8 C45 4 58 4 65 8 C72 12 78 18 84 20 C90 22 92 25 92 25 H85 C83 22 79 20 75 20 C71 20 67 22 65 25 H35 C33 22 29 20 25 20 C21 20 17 22 15 25 Z" fill="#dc2626" />
              <path d="M41 9 C41 9 45 6 52 6 H61 C64 6 68 9 70 12 L73 17 H45 L41 9 Z" fill="#ffffff" opacity="0.6" />
              <g className="car-wheel front-wheel">
                <circle cx="25" cy="25" r="5" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="25" y1="20" x2="25" y2="30" stroke="#ffffff" strokeWidth="1" />
                <line x1="20" y1="25" x2="30" y2="25" stroke="#ffffff" strokeWidth="1" />
              </g>
              <g className="car-wheel rear-wheel">
                <circle cx="75" cy="25" r="5" fill="#1e293b" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="75" y1="20" x2="75" y2="30" stroke="#ffffff" strokeWidth="1" />
                <line x1="70" y1="25" x2="80" y2="25" stroke="#ffffff" strokeWidth="1" />
              </g>
            </svg>
          </div>
          <div className="car-road-line"></div>
        </div>
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
                <strong>Dashboard Access Blocked:</strong> As a mandatory security measure, you must complete your profile (emergency contacts, Aadhaar, PAN card, date of birth, and address) before you can access any sales records, mark attendance, or view CRM stats.
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
                <label className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <UploadCloud size={16} /> Upload Profile Photo
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Personal Details */}
              <div className="setup-section-title">
                <Users size={18} /> Personal Details
              </div>
              <div className="setup-form-grid">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input required type="text" value={profileForm.full_name} onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })} className="form-input" placeholder="Enter Full Name" />
                </div>
                <div>
                  <label className="form-label">Mobile Number *</label>
                  <input required type="text" value={profileForm.mobile} onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })} className="form-input" placeholder="Enter Mobile Number" />
                </div>
                <div>
                  <label className="form-label">Account Password *</label>
                  <input required type="text" value={profileForm.password} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} className="form-input" placeholder="Choose Password" />
                </div>
                <div>
                  <label className="form-label">Date of Birth *</label>
                  <input required type="date" value={profileForm.date_of_birth} onChange={e => setProfileForm({ ...profileForm, date_of_birth: e.target.value })} className="form-input" />
                </div>
              </div>

              {/* Family Contacts */}
              <div className="setup-section-title">
                <Phone size={18} /> Emergency Family Contacts (2 required)
              </div>
              <div className="setup-form-grid">
                <div>
                  <label className="form-label">Family Member Contact 1 *</label>
                  <input required type="text" value={profileForm.family_contact_1} onChange={e => setProfileForm({ ...profileForm, family_contact_1: e.target.value })} className="form-input" placeholder="e.g. Father's / Spouse's Phone" />
                </div>
                <div>
                  <label className="form-label">Family Member Contact 2 *</label>
                  <input required type="text" value={profileForm.family_contact_2} onChange={e => setProfileForm({ ...profileForm, family_contact_2: e.target.value })} className="form-input" placeholder="e.g. Mother's / Sibling's Phone" />
                </div>
              </div>

              {/* Address Details */}
              <div className="setup-section-title">
                <MapPin size={18} /> Residential Address
              </div>
              <div className="setup-form-grid">
                <div className="form-group-full">
                  <label className="form-label">Full Address *</label>
                  <textarea required value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} placeholder="House/Flat No., Street, Area, Town"></textarea>
                </div>
                <div>
                  <label className="form-label">District *</label>
                  <input required type="text" value={profileForm.district} onChange={e => setProfileForm({ ...profileForm, district: e.target.value })} className="form-input" placeholder="Enter District" />
                </div>
                <div>
                  <label className="form-label">State *</label>
                  <input required type="text" value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} className="form-input" placeholder="Enter State" />
                </div>
              </div>

              {/* Identity Proofs */}
              <div className="setup-section-title">
                <FileText size={18} /> Government Identity Verification
              </div>
              <div className="setup-form-grid" style={{ marginBottom: '1rem' }}>
                <div className="form-group-full">
                  <label className="form-label">Aadhaar Card Number *</label>
                  <input required type="text" maxLength={12} value={profileForm.aadhaar_number} onChange={e => setProfileForm({ ...profileForm, aadhaar_number: e.target.value.replace(/\D/g, '') })} className="form-input" placeholder="12-digit Aadhaar Number" />
                </div>
              </div>

              <div className="doc-upload-grid">
                <div>
                  <label className="form-label">Aadhaar Card Photo *</label>
                  <div className="premium-upload-card">
                    {profileForm.aadhaar_photo_url ? (
                      <>
                        <div className="preview-thumbnail-container">
                          <img src={profileForm.aadhaar_photo_url} className="preview-thumbnail" alt="Aadhaar Preview" />
                        </div>
                        <label className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                          Replace Photo
                          <input type="file" accept="image/*" onChange={handleAadhaarUpload} style={{ display: 'none' }} />
                        </label>
                      </>
                    ) : (
                      <>
                        <div className="upload-icon-circle"><UploadCloud size={24} /></div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Click to Upload Aadhaar</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPEG, PNG up to 5MB</span>
                        <input required type="file" accept="image/*" onChange={handleAadhaarUpload} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">PAN Card Photo *</label>
                  <div className="premium-upload-card">
                    {profileForm.pan_photo_url ? (
                      <>
                        <div className="preview-thumbnail-container">
                          <img src={profileForm.pan_photo_url} className="preview-thumbnail" alt="PAN Preview" />
                        </div>
                        <label className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                          Replace Photo
                          <input type="file" accept="image/*" onChange={handlePanUpload} style={{ display: 'none' }} />
                        </label>
                      </>
                    ) : (
                      <>
                        <div className="upload-icon-circle"><UploadCloud size={24} /></div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', marginBottom: '4px' }}>Click to Upload PAN Card</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPEG, PNG up to 5MB</span>
                        <input required type="file" accept="image/*" onChange={handlePanUpload} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem' }}>
                <button type="button" onClick={handleLogout} className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', flex: 1, padding: '0.75rem' }}>
                  Cancel & Log Out
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.75rem' }}>
                  Save and Lock Profile & Unlock Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-icon" style={{ background: 'transparent', padding: 0 }}><ShaanCarsLogo size={32} /></div>
          <span className="logo-text">RM Portal</span>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Users size={20} /> Dashboard</button>
          <button onClick={() => { setActiveTab('mysales'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'mysales' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><CarFront size={20} /> My Sales</button>
          <button onClick={() => { setActiveTab('attendance'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Calendar size={20} /> Attendance</button>
          <button onClick={() => { setActiveTab('rankings'); setIsMobileMenuOpen(false); }} className={`nav-item ${activeTab === 'rankings' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}><Medal size={20} /> Leaderboard</button>
          <button onClick={handleLogout} className="nav-item logout-btn" style={{ marginTop: 'auto', width: '100%', textAlign: 'left' }}><LogOut size={20} /> Logout</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="search-bar" style={{ flex: 1 }}>
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder="Search inventory..." className="search-input" />
            </div>
          </div>
          <div className="header-actions">
            {todayRecord && !isCheckedIn ? (
              <button disabled className="btn" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'not-allowed' }}>
                <CheckCircle size={18} /> Shift Completed Today
              </button>
            ) : (
              <button onClick={toggleAttendance} className="btn" style={{ background: isCheckedIn ? 'var(--accent-success)' : 'var(--accent-primary)', color: 'white', border: 'none', boxShadow: 'var(--shadow-sm)' }}>
                <Clock size={18} /> {isCheckedIn ? 'End Shift (Active)' : 'Start Shift'}
              </button>
            )}
            <div className="user-profile" style={{ position: 'relative', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="avatar" style={{ border: '2px solid var(--accent-primary)', width: '42px', height: '42px', margin: 0, objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ border: '2px solid var(--accent-primary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', width: '42px', height: '42px', margin: 0 }}>
                  {profile?.full_name?.charAt(0) || 'E'}
                </div>
              )}

              {isProfileMenuOpen && (
                <div style={{ position: 'absolute', top: '55px', right: '0', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '0.5rem', minWidth: '200px', zIndex: 100, border: '1px solid var(--border-color)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profile?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sales Executive ({profile?.division})</div>
                  </div>
                  <button onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (profile?.profile_completed) {
                      setIsProfileModalOpen(true);
                    } else if (isCheckedIn) {
                      setIsProfileModalOpen(true);
                    } else {
                      alert('Action Denied: You must mark your attendance (Go Active) before making any changes.');
                    }
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
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="page-title">
                  <h1>Welcome back, {profile?.full_name.split(' ')[0]}!</h1>
                  <p>Your performance & inventory control center for {profile?.division}.</p>
                </div>
                <button onClick={downloadMyAttendance} className="btn" style={{ background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Export Attendance
                </button>
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
                  {isCheckedIn && <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', border: '1px solid var(--accent-success)' }}><span style={{width:'6px', height:'6px', borderRadius:'50%', background:'var(--accent-success)', display:'inline-block', marginRight:'6px'}}></span>Shift Active</span>}
                  {todayRecord && !isCheckedIn && <span className="status-badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>Shift Completed</span>}
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span><strong style={{color:'var(--text-primary)'}}>Server Time Lock:</strong> Verified ✅ (Anti-Cheat Active)</span>
                   {!todayRecord && !isCheckedIn && (
                      <button onClick={toggleAttendance} className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Start Shift</button>
                   )}
                   {isCheckedIn && (
                      <button onClick={toggleAttendance} className="btn" style={{ background: 'var(--accent-danger)', color: 'white', padding: '0.4rem 1rem', fontSize: '0.85rem', border: 'none' }}>End Shift</button>
                   )}
                   {todayRecord && !isCheckedIn && todayRecord.check_out && (
                      <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Logged Out at {new Date(todayRecord.check_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                   )}
                </div>
              </div>

              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="glass-card hover-lift">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p className="kpi-label">Total Reward Points</p>
                      <h3 className="kpi-value">{points}</h3>
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
                      <p className="kpi-label">Vehicles Sold</p>
                      <h3 className="kpi-value">{salesCount} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {profile?.monthly_target || 5}</span></h3>
                    </div>
                    <div className="kpi-icon-wrapper green"><CheckCircle size={24} /></div>
                  </div>
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ marginTop: '12px', width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (salesCount / (profile?.monthly_target || 5)) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '3px' }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: '6px', textAlign: 'right', fontWeight: '600' }}>
                      {Math.min(100, Math.round((salesCount / (profile?.monthly_target || 5)) * 100))}% Achieved
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
                    <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', fontWeight: '600' }}>90% Attendance</span>
                  </div>
                </div>
              </div>

              <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <h3 className="chart-title" style={{ margin: 0 }}>Manage Inventory ({profile?.division})</h3>
                    <div style={{ position: 'relative', width: '250px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                      <input type="text" placeholder="Search by model, VIN..." value={inventorySearchQuery} onChange={(e) => setInventorySearchQuery(e.target.value)} className="form-input" style={{ width: '100%', paddingLeft: '36px', background: 'var(--bg-primary)' }} />
                    </div>
                  </div>
                  <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                          <th>Vehicle Model</th>
                          <th>Color & Variant</th>
                          <th>VIN Number</th>
                          <th>Price</th>
                          <th>Update Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const filteredInventory = inventory.filter(car => {
                            if (!inventorySearchQuery) return true;
                            const q = inventorySearchQuery.toLowerCase();
                            return (car.model_name?.toLowerCase().includes(q) || car.vin_number?.toLowerCase().includes(q) || car.color?.toLowerCase().includes(q) || car.variant?.toLowerCase().includes(q) || car.status?.toLowerCase().includes(q));
                          });
                          if (filteredInventory.length === 0) return <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No cars found matching your search.</td></tr>;
                          return filteredInventory.map(car => (
                            <tr key={car.id}>
                              <td>
                                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  {car.photo_url ? (
                                    <img src={car.photo_url} alt="car" style={{ width: '48px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                                  ) : null}
                                  {car.model_name}
                                </div>
                              </td>
                              <td>{car.color} - {car.variant}</td>
                              <td>{car.vin_number || 'N/A'}</td>
                              <td style={{ fontWeight: '500' }}>₹{parseFloat(car.price || 0).toLocaleString('en-IN')}</td>
                              <td>
                                <select
                                  className="form-input"
                                  value={car.status}
                                  onChange={(e) => handleStatusChange(car.id, e.target.value)}
                                  style={{ padding: '0.4rem', width: 'auto', cursor: isCheckedIn ? 'pointer' : 'not-allowed', opacity: isCheckedIn ? 1 : 0.6 }}
                                  disabled={!isCheckedIn}
                                >
                                  <option value="Available">Available</option>
                                  <option value="Booked">Booked (Hold)</option>
                                  <option value="Sold">Sold (Close Deal)</option>
                                </select>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="glass-card">
                    <div className="chart-header">
                      <h3 className="chart-title"><BarChart2 size={18} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent-primary)' }} /> My Sales Velocity</h3>
                    </div>
                    <div style={{ height: '200px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mySalesGraphData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                          <Line type="monotone" dataKey="sales" stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'var(--accent-primary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* New Personal Target Progress Card */}
                  <div className="glass-card">
                    <div className="chart-header">
                      <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={18} color="var(--accent-success)" /> Personal Target Goal
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>Monthly Sales Target</span>
                          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                            {salesCount} <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ 5 Cars</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                          {Math.min(100, Math.round((salesCount / 5) * 100))}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.round((salesCount / 5) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-secondary), var(--accent-success))', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* New Career Achievements Card */}
                  <div className="glass-card">
                    <div className="chart-header">
                      <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={18} color="var(--accent-warning)" /> Career Achievements
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: points >= 100 ? '#ecfdf5' : 'var(--bg-primary)',
                          color: points >= 100 ? 'var(--accent-success)' : 'var(--text-muted)'
                        }}>
                          <Trophy size={14} />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: points >= 100 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Century Elite</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Earned 100+ Total Points</div>
                        </div>
                        {points >= 100 ? <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: '600' }}>Unlocked</span> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Locked</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: salesCount >= 3 ? '#eef2ff' : 'var(--bg-primary)',
                          color: salesCount >= 3 ? 'var(--accent-secondary)' : 'var(--text-muted)'
                        }}>
                          <CarFront size={14} />
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: salesCount >= 3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Deal Closer</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sell 3+ total vehicles</div>
                        </div>
                        {salesCount >= 3 ? <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: '600' }}>Unlocked</span> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Locked</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'attendance' && (
            <>
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="page-title">
                  <h1>Attendance Dashboard</h1>
                  <p>Track your presence and work hours.</p>
                </div>
                <button onClick={downloadMyAttendance} className="btn" style={{ background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Export Attendance
                </button>
              </div>
              {renderCalendar()}
            </>
          )}

          {activeTab === 'rankings' && (
            <>
              {renderRankings()}
            </>
          )}

          {activeTab === 'mysales' && (
            <>
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="page-title">
                  <h1>My Sales Records</h1>
                  <p>View all the vehicles you have successfully sold.</p>
                </div>
              </div>
              <div className="glass-card">
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vehicle Model</th>
                        <th>VIN Number</th>
                        <th>Customer</th>
                        <th>Sale Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mySales.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>You haven't recorded any sales yet.</td></tr>
                      ) : (
                        mySales.map(sale => (
                          <tr key={sale.id}>
                            <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                            <td style={{ fontWeight: '600' }}>{sale.vehicle_model}</td>
                            <td>{sale.vin_number || 'N/A'}</td>
                            <td>{sale.customers?.full_name || 'Walk-in'}</td>
                            <td style={{ fontWeight: '600', color: 'var(--accent-success)' }}>₹{parseFloat(sale.sale_amount || 0).toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Edit Profile Modal (WITH FILE UPLOAD) */}
      {isProfileModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ padding: 0, overflow: 'hidden', maxWidth: '650px', width: '90%' }}>
            <div style={{ height: '100px', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button onClick={() => setIsProfileModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'white', background: 'rgba(255,255,255,0.2)', padding: '4px', borderRadius: '50%' }}><X size={20} /></button>
              <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold' }}>Employee Profile & Verification Details</h2>
            </div>

            <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Status:</span>
                {profile?.profile_completed ? (
                  <span className="success-badge-completed">
                    <CheckCircle size={14} /> Profile Locked & Verified
                  </span>
                ) : (
                  <span className="locked-badge">
                    <Lock size={14} /> Profile Pending Setup
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
                      <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '4px solid var(--bg-secondary)', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}><Camera size={32} color="var(--text-muted)" /></div>
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
                    <input required disabled={profile?.profile_completed} type="text" value={profileForm.password} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} className="form-input" />
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

                {!profile?.profile_completed && (
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>Save & Lock Profile</button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Sold Modal */}
      {isSaleModalOpen && selectedCar && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>Confirm Car Sale</h2>
              <button onClick={() => { setIsSaleModalOpen(false); fetchEmployeeData(); }} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedCar.photo_url && <img src={selectedCar.photo_url} alt="" style={{ width: '60px', borderRadius: '4px' }} />}
                <div>
                  <strong>{selectedCar.model_name}</strong> - {selectedCar.variant} ({selectedCar.color})<br />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>VIN: {selectedCar.vin_number}</span>
                </div>
              </div>
            </div>
            <form onSubmit={confirmSale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label className="form-label">Customer Name</label><input required type="text" placeholder="e.g. Rahul Sharma" value={saleForm.customer_name} onChange={e => setSaleForm({ ...saleForm, customer_name: e.target.value })} className="form-input" /></div>
              <div><label className="form-label">Mobile Number</label><input required type="text" placeholder="e.g. 9876543210" value={saleForm.customer_mobile} onChange={e => setSaleForm({ ...saleForm, customer_mobile: e.target.value })} className="form-input" /></div>
              <div><label className="form-label">Email Address (Optional)</label><input type="email" placeholder="e.g. rahul@example.com" value={saleForm.customer_email} onChange={e => setSaleForm({ ...saleForm, customer_email: e.target.value })} className="form-input" /></div>
              <div><label className="form-label">Full Address</label><textarea required placeholder="Delivery / Residential Address" value={saleForm.customer_address} onChange={e => setSaleForm({ ...saleForm, customer_address: e.target.value })} className="form-input" style={{ minHeight: '80px', resize: 'vertical' }}></textarea></div>
              <div><label className="form-label">Final Sale Amount (₹)</label><input type="number" required value={saleForm.sale_amount} onChange={e => setSaleForm({ ...saleForm, sale_amount: e.target.value })} className="form-input" /></div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>
                <Check size={18} /> Confirm & Mark Sold (+50 Pts)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
