import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, CarFront, Search, Users, LogOut, UserPlus, 
  X, Copy, Check, PlusCircle, Trophy, Clock, DollarSign, 
  TrendingUp, Edit, Box, BarChart3, Eye, Calendar, MapPin, Key, Download, Camera, CheckCircle, Wrench, Settings, Mail, Phone, UserCog, RefreshCw, Trash2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#F43F5E'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState('overview'); 
  const [revChartType, setRevChartType] = useState('composed'); 
  const [divisionFilter, setDivisionFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Global State
  const [employees, setEmployees] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [vehicleServices, setVehicleServices] = useState([]);

  // Modals & Forms
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isAddCarOpen, setIsAddCarOpen] = useState(false);
  const [isEditCarOpen, setIsEditCarOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [adminProfileForm, setAdminProfileForm] = useState({ photo_url: '', full_name: '', password: '' });
  const [selectedEmployee, setSelectedEmployee] = useState(null); 
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedSaleForService, setSelectedSaleForService] = useState(null);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);
  const [serviceForm, setServiceForm] = useState({ due_date: '', status: 'Upcoming', type: 'Free', notes: '' });
  
  const [empForm, setEmpForm] = useState({ full_name: '', email: '', password: '', role: 'Employee', division: 'Arena' });
  const [carForm, setCarForm] = useState({ id: null, division: 'Arena', model_name: '', variant: '', color: '', vin_number: '', price: '', status: 'Available', photo_urls: [] });
  const [targetForm, setTargetForm] = useState({ Arena: 15, Nexa: 20, 'True Value': 15 });
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Employee Details Fetching
  const [empDetails, setEmpDetails] = useState({ sales: [], attendance: [], totalHours: 0, salesTrend: [] });
  const [empFilterStartDate, setEmpFilterStartDate] = useState('');
  const [empFilterEndDate, setEmpFilterEndDate] = useState('');
  const [mechanicsList, setMechanicsList] = useState([]);
  const [serviceMechanicsList, setServiceMechanicsList] = useState([]);
  const [selectedMechanicIds, setSelectedMechanicIds] = useState([]);
  const [mechanicForm, setMechanicForm] = useState({ id: null, full_name: '', email: '', mobile: '', specialization: '', assigned_password: '', photo_url: '' });
  const [isMechanicModalOpen, setIsMechanicModalOpen] = useState(false);
  const [isEditMechanicModalOpen, setIsEditMechanicModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_inventory' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_services' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mechanics' }, () => { fetchDashboardData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_mechanics' }, () => { fetchDashboardData(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDashboardData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    const sessionData = localStorage.getItem('loggedInUser');
    if (!sessionData) { navigate('/login'); return; }
    const userData = JSON.parse(sessionData);
    if (userData.role !== 'Super_Admin') { navigate('/employee-dashboard'); return; }
    setProfile(userData);
    setAdminProfileForm({ photo_url: userData.photo_url || '', full_name: userData.full_name || '', password: userData.assigned_password || '' });

    const [ { data: empData }, { data: invData }, { data: salesData }, { data: attData }, { data: enqData }, { data: servData }, { data: mechData }, { data: srvMechData } ] = await Promise.all([
      supabase.from('employees').select('*').order('total_points', { ascending: false }),
      supabase.from('vehicle_inventory').select('*').order('created_at', { ascending: false }),
      supabase.from('sales').select('*, employees(full_name, division, photo_url), customers(full_name, mobile)').order('sale_date', { ascending: false }),
      supabase.from('attendance').select('*').eq('date', new Date().toISOString().split('T')[0]),
      supabase.from('enquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('vehicle_services').select('*, customers(full_name, mobile, email, address)').order('service_due_date', { ascending: true }),
      supabase.from('mechanics').select('*').order('created_at', { ascending: false }),
      supabase.from('service_mechanics').select('*, mechanics(full_name, status, specialization, photo_url), vehicle_services(vehicle_model, status, sale_id)')
    ]);

    setEmployees(empData || []);
    setInventory(invData || []);
    setSales(salesData || []);
    setTodayAttendance(attData || []);
    setEnquiries(enqData || []);
    setVehicleServices(servData || []);
    setMechanicsList(mechData || []);
    setServiceMechanicsList(srvMechData || []);
    
    if (selectedEmployee) {
      viewEmployeeDetails(empData.find(e => e.id === selectedEmployee.id) || selectedEmployee);
    }
    
    setLoading(false);
    if (manual) setTimeout(() => setIsRefreshing(false), 500);
  };

  const copyCredentials = () => {
    const text = `Hi ${successData.full_name},\nYour account is ready.\n\nLogin URL: http://localhost:5173\nEmail/Username: ${successData.email}\nPassword: ${successData.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdminProfileUpdate = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('employees').update({
      full_name: adminProfileForm.full_name, photo_url: adminProfileForm.photo_url, assigned_password: adminProfileForm.password
    }).eq('id', profile.id).select().single();
    if (!error && data) {
      localStorage.setItem('loggedInUser', JSON.stringify(data));
      setProfile(data);
      setIsAdminProfileModalOpen(false);
    } else if (error) {
       alert("Error updating profile: " + error.message);
    }
  };
  
  const handleAdminImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setAdminProfileForm({...adminProfileForm, photo_url: reader.result}); };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => { localStorage.removeItem('loggedInUser'); navigate('/login'); };

  // Helper
  const isPresent = (empId) => todayAttendance.some(a => a.employee_id === empId && a.status === 'Present' && !a.check_out);

  // Filtered Datasets
  const filteredEmployees = divisionFilter === 'All' ? employees : employees.filter(e => e.division === divisionFilter);
  const filteredInventory = divisionFilter === 'All' ? inventory : inventory.filter(c => c.division === divisionFilter);
  const filteredSales = divisionFilter === 'All' ? sales : sales.filter(s => s.division === divisionFilter);
  const filteredEnquiries = divisionFilter === 'All' ? enquiries : enquiries.filter(e => e.division === divisionFilter);
  const filteredMechanics = divisionFilter === 'All' ? mechanicsList : mechanicsList.filter(m => m.division === divisionFilter);

  const q = searchQuery.toLowerCase();
  const searchedEmployees = filteredEmployees.filter(e => e.full_name?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q));
  const searchedInventory = filteredInventory.filter(c => c.model_name?.toLowerCase().includes(q) || c.vin_number?.toLowerCase().includes(q) || c.status?.toLowerCase().includes(q));
  const searchedSales = filteredSales.filter(s => s.customers?.full_name?.toLowerCase().includes(q) || s.vehicle_model?.toLowerCase().includes(q) || s.employees?.full_name?.toLowerCase().includes(q));

  // KPI Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = filteredSales.filter(s => s.sale_date && s.sale_date.startsWith(todayStr));
  
  const todayEarnings = todaySales.reduce((sum, s) => sum + (parseFloat(s.sale_amount) || 0), 0);
  const lifetimeEarnings = filteredSales.reduce((sum, s) => sum + (parseFloat(s.sale_amount) || 0), 0);
  const totalAvailableCars = filteredInventory.filter(c => c.status === 'Available').length;

  // Chart Data Calculations
  const salesByDivision = filteredSales.reduce((acc, sale) => {
    acc[sale.division] = (acc[sale.division] || 0) + (parseFloat(sale.sale_amount) || 0);
    return acc;
  }, {});
  const divisionChartData = Object.keys(salesByDivision).map(key => ({ name: key, value: salesByDivision[key] }));

  const salesByModel = filteredSales.reduce((acc, sale) => {
    acc[sale.vehicle_model] = (acc[sale.vehicle_model] || 0) + 1;
    return acc;
  }, {});
  const modelChartData = Object.keys(salesByModel).map(key => ({ name: key, sales: salesByModel[key] }));

  const divsToMap = divisionFilter === 'All' ? ['Arena', 'Nexa', 'True Value'] : [divisionFilter];

  const staffChartData = divsToMap.map(div => ({
    name: div,
    Total: employees.filter(e => e.division === div).length,
    Active: employees.filter(e => e.division === div && isPresent(e.id)).length
  }));

  // Sales Trend Data (Enquiries vs Sales) for last 7 days
  const salesTrendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); 
    
    const daySalesCount = filteredSales.filter(s => new Date(s.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) === dateStr).length;
    const dayEnqCount = filteredEnquiries.filter(e => new Date(e.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) === dateStr).length;

    salesTrendData.push({ date: dateStr, Enquiries: dayEnqCount, Sales: daySalesCount });
  }

  // Inventory Pipeline Data
  const inventoryPipelineData = divsToMap.map(div => {
    const divCars = inventory.filter(c => c.division === div);
    return {
      name: div,
      Available: divCars.filter(c => c.status === 'Available').length,
      Booked: divCars.filter(c => c.status === 'Booked').length,
      Sold: divCars.filter(c => c.status === 'Sold').length,
    };
  });

  // Recent Activity Feed (Top 5 Recent Sales)
  const recentActivity = filteredSales.slice(0, 5);

  const topEmployees = [...filteredEmployees].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 5);
  const topMechanics = [...filteredMechanics].sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).slice(0, 5);

  // Forms Logic
  const handleSaveMechanic = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('mechanics').insert([{ full_name: mechanicForm.full_name, email: mechanicForm.email, assigned_password: mechanicForm.assigned_password || '123456', mobile: mechanicForm.mobile, specialization: mechanicForm.specialization, division: mechanicForm.division, photo_url: mechanicForm.photo_url || null }]);
    if (error) { alert('Error: ' + error.message); return; }
    setIsMechanicModalOpen(false);
    setSuccessData({ title: 'Mechanic Created!', email: mechanicForm.email, password: mechanicForm.assigned_password || '123456', full_name: mechanicForm.full_name, type: 'emp' });
    setMechanicForm({ id: null, full_name: '', email: '', mobile: '', specialization: '', assigned_password: '', photo_url: '', division: 'Arena' });
  };

  const handleMechanicImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setMechanicForm({ ...mechanicForm, photo_url: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const openEditMechanic = (mech) => {
    setMechanicForm({ ...mech, assigned_password: mech.assigned_password || '', photo_url: mech.photo_url || '', division: mech.division || 'Arena' });
    setIsEditMechanicModalOpen(true);
  };

  const handleEditMechanic = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('mechanics').update({
      full_name: mechanicForm.full_name, email: mechanicForm.email, mobile: mechanicForm.mobile, 
      specialization: mechanicForm.specialization, photo_url: mechanicForm.photo_url || null,
      division: mechanicForm.division, assigned_password: mechanicForm.assigned_password || null
    }).eq('id', mechanicForm.id);
    if (error) { alert('Error: ' + error.message); return; }
    setIsEditMechanicModalOpen(false);
    setMechanicForm({ id: null, full_name: '', email: '', mobile: '', specialization: '', assigned_password: '', photo_url: '', division: 'Arena' });
  };

  const handleCarImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (carForm.photo_urls.length >= 3) {
        alert('You can only upload up to 3 images.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCarForm({ ...carForm, photo_urls: [...carForm.photo_urls, reader.result] });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCarImage = (index) => {
    setCarForm({ ...carForm, photo_urls: carForm.photo_urls.filter((_, i) => i !== index) });
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    const photoData = carForm.photo_urls.length > 0 ? JSON.stringify(carForm.photo_urls) : null;
    const { error } = await supabase.from('vehicle_inventory').insert([{ division: carForm.division, model_name: carForm.model_name, variant: carForm.variant, color: carForm.color, vin_number: carForm.vin_number, price: parseFloat(carForm.price) || 0, photo_url: photoData }]);
    if (error) { alert('Error: ' + error.message); return; }
    setIsAddCarOpen(false);
    setSuccessData({ title: 'Car Added!', msg: `${carForm.model_name} added to inventory.`, type: 'msg' });
    setCarForm({ id: null, division: 'Arena', model_name: '', variant: '', color: '', vin_number: '', price: '', status: 'Available', photo_urls: [] });
  };

  const openEditCar = (car) => { 
    let parsedUrls = [];
    if (car.photo_url) {
      try {
        parsedUrls = JSON.parse(car.photo_url);
        if (!Array.isArray(parsedUrls)) parsedUrls = [car.photo_url]; // Fallback to single image string if not JSON
      } catch (e) {
        parsedUrls = [car.photo_url];
      }
    }
    setCarForm({ ...car, photo_urls: parsedUrls }); 
    setIsEditCarOpen(true); 
  };

  const handleEditCar = async (e) => {
    e.preventDefault();
    const photoData = carForm.photo_urls.length > 0 ? JSON.stringify(carForm.photo_urls) : null;
    const { error } = await supabase.from('vehicle_inventory').update({
      division: carForm.division, model_name: carForm.model_name, variant: carForm.variant, 
      color: carForm.color, vin_number: carForm.vin_number, price: parseFloat(carForm.price) || 0,
      status: carForm.status, photo_url: photoData
    }).eq('id', carForm.id);
    if (error) { alert('Error: ' + error.message); return; }
    setIsEditCarOpen(false);
    setCarForm({ id: null, division: 'Arena', model_name: '', variant: '', color: '', vin_number: '', price: '', status: 'Available', photo_urls: [] });
  };

  const openTargetModal = (currentArena, currentNexa, currentTv) => {
    setTargetForm({ Arena: currentArena, Nexa: currentNexa, 'True Value': currentTv });
    setIsTargetModalOpen(true);
  };

  const openServiceModal = (sale) => {
    setSelectedSaleForService(sale);
    setServiceForm({ due_date: '', status: 'Upcoming', type: 'Free', notes: '' });
    setSelectedMechanicIds([]);
    setIsServiceModalOpen(true);
  };

  const handleMechanicSelection = (mechanicId) => {
    if (selectedMechanicIds.includes(mechanicId)) {
      setSelectedMechanicIds(selectedMechanicIds.filter(id => id !== mechanicId));
    } else {
      setSelectedMechanicIds([...selectedMechanicIds, mechanicId]);
    }
  };



  const handleSaveService = async (e) => {
    e.preventDefault();
    const { data: newService, error } = await supabase.from('vehicle_services').insert([{
      sale_id: selectedSaleForService.id,
      customer_id: selectedSaleForService.customer_id,
      vehicle_model: selectedSaleForService.vehicle_model,
      service_due_date: serviceForm.due_date,
      status: serviceForm.status,
      notes: `[${serviceForm.type}] ${serviceForm.notes}`
    }]).select().single();
    
    if (error) { alert('Error: ' + error.message); return; }

    if (selectedMechanicIds.length > 0) {
      const mechanicMappings = selectedMechanicIds.map(mId => ({
        service_id: newService.id,
        mechanic_id: mId
      }));
      await supabase.from('service_mechanics').insert(mechanicMappings);
      
      // Update mechanic status to Booked if service is not Completed
      if (serviceForm.status !== 'Completed') {
        await supabase.from('mechanics')
          .update({ status: 'Booked' })
          .in('id', selectedMechanicIds);
      }
    }

    setIsServiceModalOpen(false);
    setIsServiceModalOpen(false);
    setSuccessData({ title: 'Service Logged!', msg: 'Service and Mechanics assigned successfully.', type: 'msg' });
  };

  const handleDeleteEmployee = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove employee "${name}"? This action cannot be undone.`)) {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchDashboardData();
    }
  };

  const handleDeleteMechanic = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove mechanic "${name}"? This action cannot be undone.`)) {
      const { error } = await supabase.from('mechanics').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchDashboardData();
    }
  };

  const handleDeleteCar = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the vehicle "${name}" from inventory? This action cannot be undone.`)) {
      const { error } = await supabase.from('vehicle_inventory').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchDashboardData();
    }
  };

  const handleSetTarget = async (e) => {
    e.preventDefault();
    let hasError = false;
    let errorMsg = '';

    // Update Arena
    let arenaEmps = employees.filter(emp => emp.division === 'Arena');
    if (arenaEmps.length > 0) {
      let perEmp = Math.round(targetForm.Arena / arenaEmps.length);
      const { error } = await supabase.from('employees').update({ monthly_target: perEmp }).eq('division', 'Arena');
      if (error) { hasError = true; errorMsg = error.message; }
    }
    // Update Nexa
    let nexaEmps = employees.filter(emp => emp.division === 'Nexa');
    if (nexaEmps.length > 0 && !hasError) {
      let perEmp = Math.round(targetForm.Nexa / nexaEmps.length);
      const { error } = await supabase.from('employees').update({ monthly_target: perEmp }).eq('division', 'Nexa');
      if (error) { hasError = true; errorMsg = error.message; }
    }
    // Update True Value
    let tvEmps = employees.filter(emp => emp.division === 'True Value');
    if (tvEmps.length > 0 && !hasError) {
      let perEmp = Math.round(targetForm['True Value'] / tvEmps.length);
      const { error } = await supabase.from('employees').update({ monthly_target: perEmp }).eq('division', 'True Value');
      if (error) { hasError = true; errorMsg = error.message; }
    }

    if (hasError) {
      alert("Failed to save targets! Database Error: " + errorMsg + "\n\nDid you run the SQL command to add the 'monthly_target' column?");
      return;
    }

    setIsTargetModalOpen(false);
    fetchDashboardData();
  };

  // Employee Details Logic
  const viewEmployeeDetails = async (emp) => {
    setSelectedEmployee(emp);
    setEmpFilterStartDate('');
    setEmpFilterEndDate('');
    const { data: empSales } = await supabase.from('sales').select('*').eq('sold_by_employee', emp.id).order('sale_date', { ascending: false });
    const { data: empAtt } = await supabase.from('attendance').select('*').eq('employee_id', emp.id).order('date', { ascending: false });
    
    let totalHrs = 0;
    if (empAtt) {
      empAtt.forEach(record => {
        if (record.check_in && record.check_out) {
          const diffMs = new Date(record.check_out) - new Date(record.check_in);
          if (diffMs > 0) totalHrs += (diffMs / (1000 * 60 * 60));
        }
      });
    }

    // Process Sales Trend for Employee Modal
    const trend = {};
    (empSales || []).forEach(sale => {
       const date = new Date(sale.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
       trend[date] = (trend[date] || 0) + 1;
    });
    const salesTrendData = Object.keys(trend).map(date => ({ date, units: trend[date] })).reverse();

    setEmpDetails({ sales: empSales || [], attendance: empAtt || [], totalHours: totalHrs.toFixed(1), salesTrend: salesTrendData });
  };

  const downloadAttendanceCSV = () => {
    if (!empDetails || !empDetails.attendance || empDetails.attendance.length === 0) {
      alert("No attendance records found for this employee.");
      return;
    }
    
    const csvData = empDetails.attendance.map(a => {
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
    a.download = `${selectedEmployee.full_name}_Attendance_Report.csv`;
    a.click();
  };

  const exportEmployeeSalesToCSV = () => {
    if (!empDetails || empDetails.sales.length === 0) return;
    const csvData = empDetails.sales.map(s => ({
        "Sale Date": new Date(s.sale_date).toLocaleDateString(),
        "Sale Time": new Date(s.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        "Vehicle Model": s.vehicle_model,
        "Division": s.division,
        "Sale Amount (INR)": s.sale_amount
    }));
    const headers = Object.keys(csvData[0]);
    const csvRows = [headers.join(',')];
    for (const row of csvData) {
        csvRows.push(headers.map(h => `"${row[h]}"`).join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  const exportAllSalesToCSV = () => {
    if (!sales || sales.length === 0) return;
    const csvData = sales.map(s => {
      const emp = employees.find(e => e.id === s.sold_by_employee);
      return {
        "Sale Date": new Date(s.sale_date).toLocaleDateString(),
        "Sale Time": new Date(s.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        "Vehicle Model": s.vehicle_model,
        "Division": s.division,
        "Sale Amount (INR)": s.sale_amount,
        "Sold By": emp ? emp.full_name : 'Unknown'
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
    a.download = `Company_Sales_Master_Report.csv`;
    a.click();
  };


  const arenaSales = filteredSales.filter(s => s.division === 'Arena').length;
  const nexaSales = filteredSales.filter(s => s.division === 'Nexa').length;
  const tvSales = filteredSales.filter(s => s.division === 'True Value').length;
  
  const arenaTarget = filteredEmployees.filter(e => e.division === 'Arena').reduce((sum, e) => sum + (e.monthly_target || 0), 0) || (divisionFilter === 'All' || divisionFilter === 'Arena' ? 15 : 0);
  const nexaTarget = filteredEmployees.filter(e => e.division === 'Nexa').reduce((sum, e) => sum + (e.monthly_target || 0), 0) || (divisionFilter === 'All' || divisionFilter === 'Nexa' ? 20 : 0);
  const tvTarget = filteredEmployees.filter(e => e.division === 'True Value').reduce((sum, e) => sum + (e.monthly_target || 0), 0) || (divisionFilter === 'All' || divisionFilter === 'True Value' ? 15 : 0);
  const totalSalesTarget = arenaTarget + nexaTarget + tvTarget;
  
  const pctCompleted = totalSalesTarget > 0 ? Math.min(100, Math.round((filteredSales.length / totalSalesTarget) * 100)) : 0;

  if (loading) {
    return (
      <div className="premium-loader-overlay">
        <div className="premium-spinner"></div>
        <div className="premium-loader-text">Loading Workspace</div>
        <div className="premium-loader-brand">SHAAN CARS CRM</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar - Tab Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon"><CarFront size={24} /></div>
          <span className="logo-text">Super Admin</span>
        </div>
        <nav className="sidebar-nav">
          <button onClick={() => handleTabChange('overview')} className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <LayoutDashboard size={20} /> Overview
          </button>
          <button onClick={() => handleTabChange('employees')} className={`nav-item ${activeTab === 'employees' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <Users size={20} /> Staff Directory
          </button>
          <button onClick={() => handleTabChange('inventory')} className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <Box size={20} /> Inventory Master
          </button>
          <button onClick={() => handleTabChange('sales')} className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <DollarSign size={20} /> Sales History
          </button>
          <button onClick={() => handleTabChange('services')} className={`nav-item ${activeTab === 'services' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <Wrench size={20} /> Service Center
          </button>
          <button onClick={() => handleTabChange('mechanics')} className={`nav-item ${activeTab === 'mechanics' ? 'active' : ''}`} style={{ width: '100%', textAlign: 'left' }}>
            <UserCog size={20} /> Mechanics Team
          </button>
          
          <button onClick={handleLogout} className="nav-item logout-btn" style={{ textAlign: 'left', width: '100%' }}>
            <LogOut size={20} /> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <header className="top-header">
          <div style={{ fontWeight: '600', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            {activeTab === 'overview' && 'Company Overview Analytics'}
            {activeTab === 'employees' && 'Staff Directory & Performance'}
            {activeTab === 'inventory' && 'Central Inventory Control'}
            {activeTab === 'sales' && 'Sales & Revenue Master'}
            {activeTab === 'services' && 'Vehicle Services Master'}
          </div>
          <div className="header-actions">
            <button onClick={() => fetchDashboardData(true)} className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Refresh Dashboard">
              <RefreshCw size={18} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => setIsAddCarOpen(true)} className="btn" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <PlusCircle size={18} /> Add Car
            </button>
            <button onClick={() => setIsAddEmployeeOpen(true)} className="btn btn-primary">
              <UserPlus size={18} /> Add Employee
            </button>
            <div className="user-profile" style={{ position: 'relative', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }} onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}>
              {profile?.photo_url ? (
                 <img src={profile.photo_url} alt="Profile" className="avatar" style={{ border: '2px solid var(--accent-primary)', width: '42px', height: '42px', margin: 0, objectFit: 'cover' }} />
              ) : (
                 <div className="avatar" style={{ border: '2px solid var(--accent-primary)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', width: '42px', height: '42px', margin: 0 }}>
                    {profile?.full_name?.charAt(0) || 'A'}
                 </div>
              )}
              
              {isProfileMenuOpen && (
                <div style={{ position: 'absolute', top: '55px', right: '0', background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '0.5rem', minWidth: '200px', zIndex: 100, border: '1px solid var(--border-color)', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{profile?.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Super Admin</div>
                  </div>
                  <button onClick={() => { setIsProfileMenuOpen(false); setIsAdminProfileModalOpen(true); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem', borderRadius: '8px', color: 'var(--text-secondary)', background: 'transparent', textAlign: 'left', cursor: 'pointer', transition: '0.2s', border: 'none' }} onMouseOver={(e) => e.currentTarget.style.background='var(--bg-tertiary)'} onMouseOut={(e) => e.currentTarget.style.background='transparent'}>
                    <Settings size={16} /> Edit Profile
                  </button>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem', borderRadius: '8px', color: 'var(--accent-danger)', background: 'transparent', textAlign: 'left', cursor: 'pointer', transition: '0.2s', border: 'none' }} onMouseOver={(e) => e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'} onMouseOut={(e) => e.currentTarget.style.background='transparent'}>
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {selectedEmployee ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
              {/* Header / Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => setSelectedEmployee(null)} className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px' }}><X size={16} /> Back to Directory</button>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}><Users size={24} color="var(--accent-primary)"/> Employee Intelligence</h2>
                 </div>
              </div>

              {/* Profile Identity Card - Premium Redesign */}
              <div className="glass-card" style={{ display: 'flex', alignItems: 'stretch', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '2.5rem 3rem', display: 'flex', alignItems: 'center', gap: '2rem', flex: 1, borderRight: '1px solid var(--border-color)' }}>
                  <div style={{ position: 'relative' }}>
                    {selectedEmployee.photo_url ? (
                      <img src={selectedEmployee.photo_url} alt="" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                    ) : (
                      <div className="avatar" style={{width:'120px', height:'120px', fontSize:'3.5rem', border: '4px solid white', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'}}>{selectedEmployee.full_name.charAt(0)}</div>
                    )}
                    <span style={{ position: 'absolute', bottom: 5, right: 5, width: 20, height: 20, background: 'var(--accent-success)', border: '3px solid white', borderRadius: '50%' }}></span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <h2 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{selectedEmployee.full_name}</h2>
                      <span className="status-badge won" style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: '700' }}>Active Staff</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', padding: '6px 16px', borderRadius: '24px', fontSize: '0.875rem', fontWeight: '600', border: '1px solid var(--border-color)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}><MapPin size={16} color="var(--accent-primary)"/> {selectedEmployee.division} Division</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', color: 'var(--accent-warning)', padding: '6px 16px', borderRadius: '24px', fontSize: '0.875rem', fontWeight: '700', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}><Trophy size={16}/> {selectedEmployee.total_points} Reward Points</span>
                    </div>
                  </div>
                </div>
                
                {/* Contact Info Sidebar */}
                <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem', minWidth: '320px', background: 'var(--bg-tertiary)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Mail size={18} /></div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email Address</div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedEmployee.email}</div>
                      </div>
                   </div>
                   {selectedEmployee.mobile && (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={18} /></div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mobile Number</div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedEmployee.mobile}</div>
                      </div>
                   </div>
                   )}
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '10px', borderRadius: '12px', background: 'white', border: '1px solid var(--border-color)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Key size={18} /></div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Login Password</div>
                        <div style={{ fontWeight: '600', color: 'var(--accent-danger)' }}>{selectedEmployee.assigned_password}</div>
                      </div>
                   </div>
                </div>
              </div>

              {/* KPIs Grid */}
              {(() => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                
                const sales30Days = empDetails.sales.filter(s => new Date(s.sale_date) >= thirtyDaysAgo).length;
                const salesToday = empDetails.sales.filter(s => new Date(s.sale_date) >= todayStart).length;
                const revenueLakhs = (empDetails.sales.reduce((sum, s) => sum + (parseFloat(s.sale_amount)||0), 0) / 100000).toFixed(1);

                return (
                  <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '0' }}>
                    <div className="glass-card" style={{ background: 'white', border: 'none', borderLeft: '4px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', color: 'var(--accent-primary)' }}><CarFront size={28}/></div>
                      <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Sold</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{empDetails.sales.length}</div>
                      </div>
                    </div>
                    <div className="glass-card" style={{ background: 'white', border: 'none', borderLeft: '4px solid var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', color: 'var(--accent-warning)' }}><Calendar size={28}/></div>
                      <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last 30 Days</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{sales30Days}</div>
                      </div>
                    </div>
                    <div className="glass-card" style={{ background: 'white', border: 'none', borderLeft: '4px solid var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', color: 'var(--accent-danger)' }}><TrendingUp size={28}/></div>
                      <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sold Today</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{salesToday}</div>
                      </div>
                    </div>
                    <div className="glass-card" style={{ background: 'white', border: 'none', borderLeft: '4px solid var(--accent-success)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', color: 'var(--accent-success)' }}><DollarSign size={28}/></div>
                      <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>₹{revenueLakhs}L</div>
                      </div>
                    </div>
                    <div className="glass-card" style={{ background: 'white', border: 'none', borderLeft: '4px solid var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem' }}>
                      <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', color: 'var(--accent-secondary)' }}><Clock size={28}/></div>
                      <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Work Hours</div>
                          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{empDetails.totalHours}h</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Bottom Section: Graph + Tables */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ background: 'white', border: 'none', display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header" style={{ marginBottom: '1rem' }}><h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={18} color="var(--accent-primary)"/> Sales Velocity Trend</h3></div>
                  <div style={{ height: '320px', width: '100%', position: 'relative' }}>
                    {empDetails.salesTrend.length === 0 ? <div style={{textAlign:'center', paddingTop:'3rem', color:'var(--text-muted)'}}>No sales data.</div> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={empDetails.salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip cursor={{ stroke: 'var(--border-color)', strokeWidth: 1, strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                        <Line type="monotone" dataKey="units" stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'white', stroke: 'var(--accent-primary)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent-primary)' }} />
                      </LineChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1rem 1.5rem', background: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.875rem' }}>Filter Records:</span>
                  <input type="date" value={empFilterStartDate} onChange={e => setEmpFilterStartDate(e.target.value)} className="form-input" style={{ width: '150px', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} />
                  <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>to</span>
                  <input type="date" value={empFilterEndDate} onChange={e => setEmpFilterEndDate(e.target.value)} className="form-input" style={{ width: '150px', padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} />
                  <button onClick={() => { setEmpFilterStartDate(''); setEmpFilterEndDate(''); }} className="btn" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>Clear Filter</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="glass-card" style={{ padding: 0, background: 'white', border: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Lifetime Sales History</span>
                      <button onClick={exportEmployeeSalesToCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', background: 'white', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '600', boxShadow: 'var(--shadow-sm)' }}>
                        <Download size={14} /> CSV
                      </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px' }}>
                      <table className="data-table" style={{ border: 'none' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr><th>Date</th><th>Model</th><th>Amount</th></tr></thead>
                        <tbody>
                          {empDetails.sales.filter(s => {
                            if(!empFilterStartDate && !empFilterEndDate) return true;
                            const d = new Date(s.sale_date);
                            const start = empFilterStartDate ? new Date(empFilterStartDate) : new Date('2000-01-01');
                            const end = empFilterEndDate ? new Date(empFilterEndDate) : new Date('2100-01-01');
                            end.setHours(23, 59, 59);
                            return d >= start && d <= end;
                          }).length === 0 ? <tr><td colSpan="3" style={{textAlign: 'center'}}>No sales in this period.</td></tr> : empDetails.sales.filter(s => {
                            if(!empFilterStartDate && !empFilterEndDate) return true;
                            const d = new Date(s.sale_date);
                            const start = empFilterStartDate ? new Date(empFilterStartDate) : new Date('2000-01-01');
                            const end = empFilterEndDate ? new Date(empFilterEndDate) : new Date('2100-01-01');
                            end.setHours(23, 59, 59);
                            return d >= start && d <= end;
                          }).map(s => (
                            <tr key={s.id}>
                              <td>{new Date(s.sale_date).toLocaleDateString()}</td>
                              <td style={{ fontWeight: '500' }}>{s.vehicle_model}</td>
                              <td style={{ fontWeight: '600', color: 'var(--accent-success)' }}>₹{(parseFloat(s.sale_amount||0)/100000).toFixed(1)}L</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="glass-card" style={{ flex: 1, padding: 0, background: 'white', border: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       Lifetime Attendance Log
                       <button onClick={downloadAttendanceCSV} className="btn" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: '1px solid var(--border-color)' }}>
                           <Download size={14} /> CSV
                       </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px' }}>
                      <table className="data-table" style={{ border: 'none' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr><th>Date</th><th>Time Log</th><th>Status</th></tr></thead>
                        <tbody>
                          {empDetails.attendance.filter(a => {
                            if(!empFilterStartDate && !empFilterEndDate) return true;
                            const d = new Date(a.date);
                            const start = empFilterStartDate ? new Date(empFilterStartDate) : new Date('2000-01-01');
                            const end = empFilterEndDate ? new Date(empFilterEndDate) : new Date('2100-01-01');
                            end.setHours(23, 59, 59);
                            return d >= start && d <= end;
                          }).length === 0 ? <tr><td colSpan="3" style={{textAlign: 'center'}}>No records in this period.</td></tr> : empDetails.attendance.filter(a => {
                            if(!empFilterStartDate && !empFilterEndDate) return true;
                            const d = new Date(a.date);
                            const start = empFilterStartDate ? new Date(empFilterStartDate) : new Date('2000-01-01');
                            const end = empFilterEndDate ? new Date(empFilterEndDate) : new Date('2100-01-01');
                            end.setHours(23, 59, 59);
                            return d >= start && d <= end;
                          }).map(a => (
                            <tr key={a.id}>
                              <td>{new Date(a.date).toLocaleDateString()}</td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                 {a.check_in ? new Date(a.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'} <br/> 
                                 {a.check_out ? new Date(a.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active'}
                              </td>
                              <td><span className={`status-badge ${a.status==='Present' ? 'won' : 'hot'}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>{a.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                {activeTab !== 'overview' ? (
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input type="text" placeholder={`Search by name, model...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-input" style={{ width: '100%', paddingLeft: '36px', background: 'white', boxShadow: 'var(--shadow-sm)' }} />
              </div>
            ) : <div />}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.875rem' }}><MapPin size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-3px' }}/> Division Filter:</span>
              <select value={divisionFilter} onChange={(e) => setDivisionFilter(e.target.value)} className="form-input" style={{ width: '200px', cursor: 'pointer', background: 'white', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-color)' }}>
                <option value="All">All Divisions</option>
                <option value="Arena">Arena</option>
                <option value="Nexa">Nexa</option>
                <option value="True Value">True Value</option>
              </select>
            </div>
          </div>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Massive KPI Grid */}
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                  <div className="kpi-icon-wrapper green" style={{ width:'36px', height:'36px', marginBottom:'0.5rem' }}><DollarSign size={20} /></div>
                  <div className="kpi-value" style={{ fontSize:'1.25rem' }}>₹{todayEarnings.toLocaleString('en-IN')}</div>
                  <div className="kpi-label">Today's Earnings</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: '600', marginTop: '4px' }}>+8.4% vs avg</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                  <div className="kpi-icon-wrapper blue" style={{ width:'36px', height:'36px', marginBottom:'0.5rem' }}><TrendingUp size={20} /></div>
                  <div className="kpi-value" style={{ fontSize:'1.25rem' }}>₹{lifetimeEarnings.toLocaleString('en-IN')}</div>
                  <div className="kpi-label">Lifetime Earnings</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Cumulative revenue</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                  <div className="kpi-icon-wrapper orange" style={{ width:'36px', height:'36px', marginBottom:'0.5rem' }}><CarFront size={20} /></div>
                  <div className="kpi-value" style={{ fontSize:'1.25rem' }}>{todaySales.length}</div>
                  <div className="kpi-label">Cars Sold (Today)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: '600', marginTop: '4px' }}>+12% today</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                  <div className="kpi-icon-wrapper purple" style={{ width:'36px', height:'36px', marginBottom:'0.5rem' }}><Trophy size={20} /></div>
                  <div className="kpi-value" style={{ fontSize:'1.25rem' }}>{sales.length}</div>
                  <div className="kpi-label">Cars Sold (Lifetime)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>All-time volume</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                  <div className="kpi-icon-wrapper blue" style={{ width:'36px', height:'36px', marginBottom:'0.5rem' }}><Users size={20} /></div>
                  <div className="kpi-value" style={{ fontSize:'1.25rem' }}>{employees.length}</div>
                  <div className="kpi-label">Total Staff</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: '600', marginTop: '4px' }}>100% active</div>
                </div>
                <div className="glass-card" style={{ padding: '1.25rem 1rem' }}>
                  <div className="kpi-icon-wrapper green" style={{ width:'36px', height:'36px', marginBottom:'0.5rem' }}><Box size={20} /></div>
                  <div className="kpi-value" style={{ fontSize:'1.25rem' }}>{totalAvailableCars}</div>
                  <div className="kpi-label">Available Inventory</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', fontWeight: '600', marginTop: '4px' }}>Needs stock</div>
                </div>
              </div>

              {/* Full Width Revenue / Sales Trend Graph */}
              <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
                  <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={18} style={{ color:'var(--accent-primary)' }}/> Sales Trend
                      </h3>
                      {/* Legend to match image */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', fontWeight: '600' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }}></span>
                          <span style={{ color: 'var(--text-secondary)' }}>Sales</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <select 
                        style={{ 
                          background: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '8px', 
                          padding: '0.4rem 0.8rem', 
                          fontSize: '0.75rem', 
                          color: 'var(--text-primary)',
                          fontWeight: '600',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-container" style={{ height: '300px' }}>
                     {salesTrendData.length === 0 ? <div style={{textAlign:'center', paddingTop:'5rem', color:'var(--text-muted)'}}>No sales data yet.</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent-success)" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="var(--accent-success)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                          <Area type="monotone" dataKey="Sales" stroke="var(--accent-success)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" dot={{ fill: 'var(--accent-success)', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
              </div>

              {/* Row 1: Division Revenue + Workforce + Target Gauge */}
              <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr 1.2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Division Wise Earnings */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header" style={{ marginBottom: '0' }}><h3 className="chart-title"><PieChart size={18} style={{ display:'inline', marginRight:'8px', color:'var(--accent-secondary)' }}/> Division Revenue</h3></div>
                  <div className="chart-container" style={{ height: '220px', flex: 1 }}>
                    {divisionChartData.length === 0 ? <div style={{textAlign:'center', paddingTop:'5rem', color:'var(--text-muted)'}}>No data.</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={divisionChartData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                            {divisionChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-secondary)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', paddingBottom: '0.5rem' }}>
                    {divisionChartData.map((entry, index) => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight:'600', color: 'var(--text-primary)' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: PIE_COLORS[index % PIE_COLORS.length], boxShadow: `0 0 8px ${PIE_COLORS[index % PIE_COLORS.length]}80` }}></div>
                        {entry.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Staff Availability Chart */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header"><h3 className="chart-title"><Users size={18} style={{ display:'inline', marginRight:'8px', color:'var(--accent-primary)' }}/> Workforce</h3></div>
                  <div className="chart-container" style={{ height: '220px', flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', background: 'var(--bg-secondary)' }} />
                        <Bar dataKey="Total" radius={[6, 6, 0, 0]} barSize={16} name="Total Employees">
                          {staffChartData.map((entry, index) => (
                            <Cell key={`cell-total-${index}`} fill={['var(--accent-danger)', 'var(--accent-secondary)', 'var(--accent-success)'][index % 3]} />
                          ))}
                        </Bar>
                        <Bar dataKey="Active" radius={[6, 6, 0, 0]} barSize={16} name="Active Now">
                          {staffChartData.map((entry, index) => (
                            <Cell key={`cell-active-${index}`} fill={['var(--accent-warning)', 'var(--accent-primary)', 'var(--accent-success)'][index % 3]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', paddingBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight:'600', color: 'var(--text-primary)' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--border-color)' }}></div>Total Employees</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight:'600', color: 'var(--text-primary)' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }}></div>Active Now</div>
                  </div>
                </div>

                {/* Sales Target Progress Card */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={18} color="var(--accent-success)" /> Target Achievement
                    </h3>
                    <button onClick={() => openTargetModal(arenaTarget, nexaTarget, tvTarget)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}>
                      Set Targets
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Overall Target</span>
                        <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px', lineHeight: '1.2' }}>
                          {filteredSales.length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/ {totalSalesTarget} Cars</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--accent-success)' }}>{pctCompleted}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '10px', background: 'var(--bg-tertiary)', borderRadius: '5px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                      <div style={{ width: `${pctCompleted}%`, height: '100%', background: 'var(--accent-success)', borderRadius: '5px', boxShadow: '0 0 10px rgba(6, 125, 98, 0.5)' }}></div>
                    </div>
                    {/* Division Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Arena ({arenaTarget})</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{arenaSales}</div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nexa ({nexaTarget})</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{nexaSales}</div>
                      </div>
                      <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>True Value ({tvTarget})</div>
                        <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>{tvSales}</div>
                      </div>
                    </div>

                    {/* Employee Target Breakdown */}
                    <div style={{ marginTop: '0.5rem', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '4px' }} className="custom-scrollbar">
                      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Employee Target Progress</div>
                      {filteredEmployees.filter(emp => emp.monthly_target > 0).map(emp => {
                        const empSalesCount = filteredSales.filter(s => s.sold_by_employee === emp.id).length;
                        const empPct = Math.min(100, Math.round((empSalesCount / emp.monthly_target) * 100));
                        return (
                          <div key={emp.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{emp.full_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({emp.division})</span></span>
                              <span style={{ color: 'var(--accent-success)', fontWeight: '700' }}>{empSalesCount} / {emp.monthly_target} ({empPct}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${empPct}%`, height: '100%', background: 'var(--accent-success)', borderRadius: '2px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                      {filteredEmployees.filter(emp => emp.monthly_target > 0).length === 0 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No targets set yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Top Models + Top Performing Employees + Recent Activity Feed */}
              <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1.2fr 1fr', gap: '1.5rem' }}>
                {/* Sales by Model */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header"><h3 className="chart-title"><BarChart3 size={18} style={{ display:'inline', marginRight:'8px', color:'var(--accent-secondary)' }}/> Top Selling Models</h3></div>
                  <div className="chart-container" style={{ height: '280px', flex: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} layout="vertical">
                        <defs>
                          <linearGradient id="colorSalesModel" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0.4}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: '500' }} width={110} />
                        <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', background: 'var(--bg-secondary)' }} />
                        <Bar dataKey="sales" fill="url(#colorSalesModel)" radius={[0, 6, 6, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Performing Employees Leaderboard */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header" style={{ marginBottom: '1.25rem' }}>
                    <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Trophy size={18} color="var(--accent-warning)" /> Top Performing Staff
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    {topEmployees.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>No staff directory data.</div>
                    ) : (
                      topEmployees.map((emp, index) => {
                        const rankColors = ['var(--accent-warning)', 'var(--text-muted)', 'var(--text-secondary)']; // Gold, Silver, Bronze
                        return (
                          <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '12px', border: index === 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)' }}>
                            {/* Rank badge */}
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: rankColors[index] || 'var(--bg-tertiary)',
                              color: index < 3 ? 'white' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.8rem',
                              fontWeight: '700',
                              boxShadow: index < 3 ? `0 0 10px ${rankColors[index]}80` : 'none'
                            }}>
                              {index + 1}
                            </div>
                            {/* Avatar */}
                            {emp.photo_url ? (
                              <img src={emp.photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
                            ) : (
                              <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
                                {emp.full_name.charAt(0)}
                              </div>
                            )}
                            {/* Name & Points */}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>{emp.full_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.division} Division</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.75rem',
                                color: 'var(--accent-warning)',
                                background: 'rgba(245, 158, 11, 0.1)',
                                padding: '6px 10px',
                                borderRadius: '20px',
                                fontWeight: '700',
                                border: '1px solid rgba(245, 158, 11, 0.2)'
                              }}>
                                <Trophy size={14} /> {emp.total_points} pts
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Top Performing Mechanics Leaderboard */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="chart-header" style={{ marginBottom: '1.25rem' }}>
                    <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Wrench size={18} color="var(--accent-primary)" /> Top Mechanics
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    {topMechanics.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>No mechanics data.</div>
                    ) : (
                      topMechanics.map((mech, index) => {
                        const rankColors = ['var(--accent-primary)', 'var(--text-muted)', 'var(--text-secondary)']; // Blue/Silver/Bronze
                        return (
                          <div key={mech.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '12px', border: index === 0 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-color)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: rankColors[index] || 'var(--bg-tertiary)', color: index < 3 ? 'white' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', boxShadow: index < 3 ? `0 0 10px ${rankColors[index]}80` : 'none' }}>
                              {index + 1}
                            </div>
                            {mech.photo_url ? (
                              <img src={mech.photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }} />
                            ) : (
                              <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
                                {mech.full_name.charAt(0)}
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>{mech.full_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{mech.division || 'General'}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 10px', borderRadius: '20px', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <Trophy size={14} /> {mech.total_points} pts
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Full Width Row: Recent Activity Feed */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
                <div className="chart-header" style={{ marginBottom: '1.25rem' }}>
                  <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color="var(--accent-success)" /> Live Sales Feed
                  </h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.25rem', maxHeight: '300px' }}>
                  {recentActivity.length === 0 ? <div style={{textAlign:'center', color:'var(--text-muted)'}}>No recent activity.</div> : (
                    recentActivity.map(sale => (
                      <div key={sale.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--accent-success)' }}></div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <CarFront size={16} color="var(--accent-success)" />
                        </div>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>{sale.vehicle_model} sold!</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>By <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{sale.employees?.full_name}</span> ({sale.division})</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.1rem', color: 'var(--accent-success)', fontWeight: '700' }}>₹{parseFloat(sale.sale_amount).toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                              <Clock size={12} /> {new Date(sale.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </>
          )}

          {/* TAB 2: EMPLOYEES */}
          {activeTab === 'employees' && (
            <div className="glass-card">
              <div className="chart-header">
                <h3 className="chart-title">Staff Directory & Live Status</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee Info</th>
                      <th>Division</th>
                      <th>Total Points</th>
                      <th>Current Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedEmployees.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '600' }}>
                            {emp.photo_url ? <img src={emp.photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} /> : <div className="avatar" style={{width:'40px', height:'40px', fontSize:'1rem'}}>{emp.full_name.charAt(0)}</div>}
                            <div>
                                {emp.full_name}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{emp.division}</td>
                        <td><div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: '16px', fontWeight: '600', color: 'var(--accent-warning)' }}><Trophy size={14}/> {emp.total_points}</div></td>
                        <td>
                          {isPresent(emp.id) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-success)', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '16px', fontWeight: '600', border: '1px solid var(--border-color)' }}><span style={{width:'6px', height:'6px', borderRadius:'50%', background:'var(--accent-success)'}}></span> Active Now</span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>Offline</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => viewEmployeeDetails(emp)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', background: 'var(--bg-tertiary)' }} title="View Dashboard">
                              <Eye size={16} /> Dashboard
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp.id, emp.full_name)} className="btn" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', color: 'var(--accent-danger)', background: 'var(--bg-tertiary)' }} title="Remove Employee">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="glass-card">
              <div className="chart-header">
                <h3 className="chart-title">Master Inventory List</h3>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vehicle Info</th>
                      <th>Division</th>
                      <th>VIN Number</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedInventory.map(car => (
                      <tr key={car.id}>
                        <td>
                          <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {(() => {
                               let firstImg = null;
                               if (car.photo_url) {
                                 try {
                                   const parsed = JSON.parse(car.photo_url);
                                   if (Array.isArray(parsed) && parsed.length > 0) firstImg = parsed[0];
                                   else firstImg = car.photo_url;
                                 } catch (e) {
                                   firstImg = car.photo_url;
                                 }
                               }
                               return firstImg ? <img src={firstImg} alt="car" style={{ width: '48px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }} /> : null;
                            })()}
                            <div>
                                {car.model_name}
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{car.color} - {car.variant}</div>
                            </div>
                          </div>
                        </td>
                        <td>{car.division}</td>
                        <td>{car.vin_number || 'N/A'}</td>
                        <td style={{ fontWeight: '500' }}>₹{parseFloat(car.price || 0).toLocaleString('en-IN')}</td>
                        <td>
                           <span className={`status-badge ${car.status === 'Sold' ? 'won' : car.status === 'Booked' ? 'warm' : 'cold'}`}>
                             {car.status}
                           </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => openEditCar(car)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                              <Edit size={14} /> Edit
                            </button>
                            <button onClick={() => handleDeleteCar(car.id, car.model_name)} className="btn" style={{ padding: '0.4rem', border: '1px solid var(--border-color)', color: 'var(--accent-danger)', background: 'var(--bg-tertiary)' }} title="Delete Vehicle">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SALES HISTORY */}
          {activeTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Master Sales Ledger</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>View all closed deals and revenue performance across divisions.</p>
                </div>
                <button onClick={exportAllSalesToCSV} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Export Master CSV
                </button>
              </div>

              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sale Date</th>
                      <th>Vehicle Info</th>
                      <th>Division</th>
                      <th>Sold By</th>
                      <th>Revenue</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedSales.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No sales records found.</td></tr>
                    ) : (
                      searchedSales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date)).map(s => {
                        const emp = employees.find(e => e.id === s.sold_by_employee);
                        return (
                          <tr key={s.id}>
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{new Date(s.sale_date).toLocaleDateString()}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td style={{ fontWeight: '600' }}>{s.vehicle_model}</td>
                            <td>
                               <span className="status-badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>{s.division}</span>
                            </td>
                            <td>
                              {emp ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {emp.photo_url ? (
                                    <img src={emp.photo_url} alt="" style={{ width:'28px', height:'28px', borderRadius:'50%', objectFit:'cover' }} />
                                  ) : (
                                    <div className="avatar" style={{ width:'28px', height:'28px', fontSize:'0.75rem' }}>{emp.full_name.charAt(0)}</div>
                                  )}
                                  <span style={{ fontWeight: '500' }}>{emp.full_name}</span>
                                </div>
                              ) : <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}
                            </td>
                            <td style={{ fontWeight: '700', color: 'var(--accent-success)' }}>
                              ₹{parseFloat(s.sale_amount || 0).toLocaleString('en-IN')}
                            </td>
                            <td>
                              <button onClick={() => setSelectedSaleDetails(s)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', background: 'var(--bg-tertiary)' }}>
                                <Eye size={16} /> View More
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: MECHANICS TEAM */}
          {activeTab === 'mechanics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Mechanics Team</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage your service mechanics and their current assignments.</p>
                </div>
                <button onClick={() => setIsMechanicModalOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={16} /> Add Mechanic
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {mechanicsList.length === 0 ? (
                  <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No mechanics registered.
                  </div>
                ) : (
                  mechanicsList.map(mech => {
                    const assignedServices = serviceMechanicsList.filter(sm => sm.mechanic_id === mech.id && sm.vehicle_services?.status !== 'Completed');
                    return (
                      <div key={mech.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {mech.photo_url ? (
                              <img src={mech.photo_url} alt="" style={{ width:'48px', height:'48px', borderRadius:'50%', objectFit:'cover' }} />
                            ) : (
                              <div className="avatar" style={{ width:'48px', height:'48px', fontSize:'1.2rem' }}>{mech.full_name.charAt(0)}</div>
                            )}
                            <div>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{mech.full_name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mech.specialization || 'General Mechanic'}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '4px' }}>
                                <button onClick={() => openEditMechanic(mech)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Edit size={12}/> Edit Details</button>
                                <button onClick={() => handleDeleteMechanic(mech.id, mech.full_name)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', fontSize: '0.75rem', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={12}/> Remove</button>
                              </div>
                            </div>
                          </div>
                          <span className={`status-badge ${mech.status === 'Available' ? 'won' : mech.status === 'Booked' ? 'warm' : 'cold'}`}>
                            {mech.status}
                          </span>
                        </div>
                        <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Current Workload</div>
                          {assignedServices.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Not working on any car.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {assignedServices.map(sm => (
                                <div key={sm.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                  <Wrench size={12} color="var(--accent-primary)" />
                                  <span>{sm.vehicle_services?.vehicle_model} <span style={{ color: 'var(--accent-warning)', fontSize: '0.75rem' }}>({sm.vehicle_services?.status})</span></span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14}/> {mech.mobile || 'N/A'}</div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={14}/> {mech.email}</div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SERVICE CENTER */}
          {activeTab === 'services' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease-in-out' }}>
              <div className="glass-card">
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Vehicle Services Master</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Track servicing schedules, free/paid limits, and maintenance history for all sold vehicles.</p>
              </div>

              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer Info</th>
                      <th>Vehicle & Sale Date</th>
                      <th>Service History & Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchedSales.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No sold vehicles found.</td></tr>
                    ) : (
                      searchedSales.sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date)).map(sale => {
                        const srvs = vehicleServices.filter(s => s.sale_id === sale.id);
                        const upcoming = srvs.find(s => s.status === 'Upcoming' || s.status === 'Overdue');
                        const totalFree = srvs.filter(s => s.notes && s.notes.includes('[Free]')).length;
                        const totalPaid = srvs.filter(s => s.notes && s.notes.includes('[Paid]')).length;
                        return (
                          <tr key={sale.id}>
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{sale.customers?.full_name || 'Walk-in Customer'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sale.customers?.mobile || 'N/A'}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{sale.vehicle_model}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sold on: {new Date(sale.sale_date).toLocaleDateString()}</div>
                            </td>
                            <td>
                              {upcoming ? (
                                <div>
                                  <span className={`status-badge ${upcoming.status === 'Overdue' ? 'cold' : 'warm'}`} style={{ marginBottom: '4px', display: 'inline-block' }}>
                                    Next: {new Date(upcoming.service_due_date).toLocaleDateString()} ({upcoming.status})
                                  </span>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Logged: {srvs.length} ({totalFree} Free, {totalPaid} Paid)</div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No upcoming services scheduled.</span>
                              )}
                            </td>
                            <td>
                              <button onClick={() => openServiceModal(sale)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Settings size={14} /> Manage
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* MODALS */}

      {/* Edit Inventory Modal */}
      {isEditCarOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '12px', color: 'var(--accent-warning)' }}>
                    <Edit size={24} />
                 </div>
                 <div>
                   <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Edit Vehicle Details</h2>
                   <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Update inventory information and status.</p>
                 </div>
               </div>
               <button onClick={() => setIsEditCarOpen(false)} style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleEditCar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                 {/* Left column: Photo Upload */}
                 <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                     <label className="form-label" style={{ fontWeight: '600' }}>Vehicle Photos (Max 3)</label>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {carForm.photo_urls && carForm.photo_urls.map((url, i) => (
                          <div key={i} style={{ position: 'relative', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={url} alt={`preview-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button type="button" onClick={() => removeCarImage(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}><X size={12} /></button>
                          </div>
                        ))}
                        {(!carForm.photo_urls || carForm.photo_urls.length < 3) && (
                          <div style={{ height: '60px', borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'var(--bg-tertiary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                             <Camera size={20} color="var(--text-muted)" />
                             <input type="file" accept="image/*" onChange={handleCarImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                          </div>
                        )}
                     </div>
                 </div>
                 
                 {/* Right column: Main fields */}
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                     <div>
                        <label className="form-label" style={{ fontWeight: '600' }}>Division <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                        <select value={carForm.division} onChange={e => setCarForm({...carForm, division: e.target.value})} className="form-input" style={{ cursor: 'pointer' }}>
                           <option>Arena</option><option>Nexa</option><option>True Value</option>
                        </select>
                     </div>
                     <div style={{ display: 'flex', gap: '1rem' }}>
                       <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>Model Name <span style={{ color: 'var(--accent-danger)' }}>*</span></label><input required type="text" placeholder="e.g. Swift" value={carForm.model_name} onChange={e => setCarForm({...carForm, model_name: e.target.value})} className="form-input" /></div>
                       <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>Variant <span style={{ color: 'var(--accent-danger)' }}>*</span></label><input required type="text" placeholder="e.g. VXI" value={carForm.variant} onChange={e => setCarForm({...carForm, variant: e.target.value})} className="form-input" /></div>
                     </div>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>Color</label><input type="text" placeholder="e.g. Arctic White" value={carForm.color} onChange={e => setCarForm({...carForm, color: e.target.value})} className="form-input" /></div>
                <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>VIN Number</label><input type="text" placeholder="17-character VIN" value={carForm.vin_number} onChange={e => setCarForm({...carForm, vin_number: e.target.value})} className="form-input" /></div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                   <label className="form-label" style={{ fontWeight: '600' }}>Listing Price (₹) <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                   <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>₹</div>
                      <input required type="number" placeholder="e.g. 750000" value={carForm.price} onChange={e => setCarForm({...carForm, price: e.target.value})} className="form-input" style={{ paddingLeft: '32px' }} />
                   </div>
                </div>
                <div style={{ flex: 1 }}>
                   <label className="form-label" style={{ fontWeight: '600' }}>Current Status</label>
                   <select value={carForm.status} onChange={e => setCarForm({...carForm, status: e.target.value})} className="form-input" style={{ cursor: 'pointer' }}>
                      <option value="Available">Available</option>
                      <option value="Booked">Booked (Hold)</option>
                      <option value="Sold">Sold</option>
                   </select>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                 <button type="button" onClick={() => setIsEditCarOpen(false)} className="btn" style={{ flex: 1, background: 'white', border: '1px solid var(--border-color)' }}>Cancel</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddEmployeeOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                   <UserPlus size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Onboard New Employee</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Create a new staff account and assign roles.</p>
                </div>
              </div>
              <button onClick={() => setIsAddEmployeeOpen(false)} style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                 <label className="form-label" style={{ fontWeight: '600' }}>Full Name <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                 <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--text-muted)' }}><Users size={16} /></div>
                    <input required type="text" placeholder="e.g. Rahul Sharma" value={empForm.full_name} onChange={e => setEmpForm({...empForm, full_name: e.target.value})} className="form-input" style={{ paddingLeft: '36px' }} />
                 </div>
              </div>
              <div className="form-group">
                 <label className="form-label" style={{ fontWeight: '600' }}>Email Address (Username) <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                 <input required type="email" placeholder="rahul@shaancars.com" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} className="form-input" />
              </div>
              <div className="form-group">
                 <label className="form-label" style={{ fontWeight: '600' }}>Assign Temporary Password <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                 <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--text-muted)' }}><Key size={16} /></div>
                    <input required type="text" placeholder="Strong password" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} className="form-input" style={{ paddingLeft: '36px' }} />
                 </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                   <label className="form-label" style={{ fontWeight: '600' }}>Division</label>
                   <select value={empForm.division} onChange={e => setEmpForm({...empForm, division: e.target.value})} className="form-input" style={{ cursor: 'pointer' }}>
                      <option>Arena</option><option>Nexa</option><option>True Value</option>
                   </select>
                </div>
                <div style={{ flex: 1 }}>
                   <label className="form-label" style={{ fontWeight: '600' }}>System Role</label>
                   <select value={empForm.role} onChange={e => setEmpForm({...empForm, role: e.target.value})} className="form-input" style={{ cursor: 'pointer' }}>
                      <option>Employee</option><option>Super_Admin</option>
                   </select>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                 <button type="button" onClick={() => setIsAddEmployeeOpen(false)} className="btn" style={{ flex: 1, background: 'white', border: '1px solid var(--border-color)' }}>Cancel</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Car Modal */}
      {isAddCarOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '12px', color: 'var(--accent-success)' }}>
                    <PlusCircle size={24} />
                 </div>
                 <div>
                   <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Add New Vehicle</h2>
                   <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Register a new vehicle into the central inventory.</p>
                 </div>
               </div>
               <button onClick={() => setIsAddCarOpen(false)} style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddCar} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                 {/* Left column: Photo Upload */}
                 <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                     <label className="form-label" style={{ fontWeight: '600' }}>Vehicle Photos (Max 3)</label>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {carForm.photo_urls && carForm.photo_urls.map((url, i) => (
                          <div key={i} style={{ position: 'relative', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <img src={url} alt={`preview-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button type="button" onClick={() => removeCarImage(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer' }}><X size={12} /></button>
                          </div>
                        ))}
                        {(!carForm.photo_urls || carForm.photo_urls.length < 3) && (
                          <div style={{ height: '60px', borderRadius: '8px', border: '2px dashed var(--border-color)', background: 'var(--bg-tertiary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                             <Camera size={20} color="var(--text-muted)" />
                             <input type="file" accept="image/*" onChange={handleCarImageUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                          </div>
                        )}
                     </div>
                 </div>
                 
                 {/* Right column: Main fields */}
                 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                     <div>
                        <label className="form-label" style={{ fontWeight: '600' }}>Division <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                        <select value={carForm.division} onChange={e => setCarForm({...carForm, division: e.target.value})} className="form-input" style={{ cursor: 'pointer' }}>
                           <option>Arena</option><option>Nexa</option><option>True Value</option>
                        </select>
                     </div>
                     <div style={{ display: 'flex', gap: '1rem' }}>
                       <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>Model Name <span style={{ color: 'var(--accent-danger)' }}>*</span></label><input required type="text" placeholder="e.g. Swift" value={carForm.model_name} onChange={e => setCarForm({...carForm, model_name: e.target.value})} className="form-input" /></div>
                       <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>Variant <span style={{ color: 'var(--accent-danger)' }}>*</span></label><input required type="text" placeholder="e.g. VXI" value={carForm.variant} onChange={e => setCarForm({...carForm, variant: e.target.value})} className="form-input" /></div>
                     </div>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>Color</label><input type="text" placeholder="e.g. Arctic White" value={carForm.color} onChange={e => setCarForm({...carForm, color: e.target.value})} className="form-input" /></div>
                <div style={{ flex: 1 }}><label className="form-label" style={{ fontWeight: '600' }}>VIN Number</label><input type="text" placeholder="17-character VIN" value={carForm.vin_number} onChange={e => setCarForm({...carForm, vin_number: e.target.value})} className="form-input" /></div>
              </div>
              
              <div className="form-group">
                 <label className="form-label" style={{ fontWeight: '600' }}>Listing Price (₹) <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                 <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>₹</div>
                    <input required type="number" placeholder="e.g. 750000" value={carForm.price} onChange={e => setCarForm({...carForm, price: e.target.value})} className="form-input" style={{ paddingLeft: '32px' }} />
                 </div>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                 <button type="button" onClick={() => setIsAddCarOpen(false)} className="btn" style={{ flex: 1, background: 'white', border: '1px solid var(--border-color)' }}>Cancel</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.75rem' }}>Add to Inventory</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Success Dialog */}
      {successData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Check size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{successData.title}</h2>
            
            {successData.type === 'emp' ? (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Share these details with {successData.full_name} so they can log in.</p>
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', textAlign: 'left', marginBottom: '1.5rem', border: '1px dashed var(--border-color)' }}>
                  <div style={{ marginBottom: '0.5rem' }}><span style={{ color: 'var(--text-muted)' }}>Email:</span> <span style={{ fontWeight: 'bold' }}>{successData.email}</span></div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Password:</span> <span style={{ fontWeight: 'bold' }}>{successData.password}</span></div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={copyCredentials} className="btn" style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    {copied ? <Check size={18} color="var(--accent-success)" /> : <Copy size={18} />} {copied ? 'Copied!' : 'Copy Details'}
                  </button>
                  <button onClick={() => setSuccessData(null)} className="btn btn-primary" style={{ flex: 1 }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{successData.msg}</p>
                <button onClick={() => setSuccessData(null)} className="btn btn-primary" style={{ width: '100%' }}>Done</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Target Setting Modal */}
      {isTargetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTargetModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Set Division Targets</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Setting a target for a division will automatically divide it equally among all employees in that division.
            </p>
            <form onSubmit={handleSetTarget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Arena Target</label>
                <input type="number" className="form-input" value={targetForm.Arena} onChange={e => setTargetForm({...targetForm, Arena: parseInt(e.target.value)||0})} min="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">Nexa Target</label>
                <input type="number" className="form-input" value={targetForm.Nexa} onChange={e => setTargetForm({...targetForm, Nexa: parseInt(e.target.value)||0})} min="0" required />
              </div>
              <div className="form-group">
                <label className="form-label">True Value Target</label>
                <input type="number" className="form-input" value={targetForm['True Value']} onChange={e => setTargetForm({...targetForm, 'True Value': parseInt(e.target.value)||0})} min="0" required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Targets</button>
                <button type="button" className="btn" onClick={() => setIsTargetModalOpen(false)} style={{ flex: 1, background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sale Details Modal */}
      {selectedSaleDetails && (
        <div className="modal-overlay" onClick={() => setSelectedSaleDetails(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                   <DollarSign size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>Sale Details</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ID: {selectedSaleDetails.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSaleDetails(null)} style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Model:</span> <span style={{ fontWeight: '600' }}>{selectedSaleDetails.vehicle_model}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Division:</span> <span className="status-badge">{selectedSaleDetails.division}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Revenue:</span> <span style={{ fontWeight: '700', color: 'var(--accent-success)' }}>₹{parseFloat(selectedSaleDetails.sale_amount || 0).toLocaleString('en-IN')}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Date:</span> <span style={{ fontWeight: '500' }}>{new Date(selectedSaleDetails.sale_date).toLocaleString()}</span></div>
                </div>
              </div>
              
              <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCog size={14} color="var(--text-muted)" /> <span style={{ fontWeight: '600' }}>{selectedSaleDetails.customers?.full_name || 'N/A'}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} color="var(--text-muted)" /> <span>{selectedSaleDetails.customers?.mobile || 'N/A'}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={14} color="var(--text-muted)" /> <span>{selectedSaleDetails.customers?.email || 'N/A'}</span></div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><MapPin size={14} color="var(--text-muted)" style={{ marginTop: '2px' }}/> <span style={{ fontSize: '0.85rem' }}>{selectedSaleDetails.customers?.address || 'N/A'}</span></div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sold By Employee</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedSaleDetails.employees?.photo_url ? (
                    <img src={selectedSaleDetails.employees.photo_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                  ) : (
                    <div className="avatar" style={{ width: '40px', height: '40px' }}>{selectedSaleDetails.employees?.full_name?.charAt(0) || '?'}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{selectedSaleDetails.employees?.full_name || 'Unknown Employee'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedSaleDetails.employees?.division || 'N/A'} Division</div>
                  </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
               <button type="button" className="btn btn-primary" onClick={() => setSelectedSaleDetails(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Service Management Modal */}
      {isServiceModalOpen && selectedSaleForService && (
        <div className="modal-overlay" onClick={() => setIsServiceModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2 className="modal-title">Manage Service: {selectedSaleForService.vehicle_model}</h2>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px dashed var(--border-color)' }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>👤 {selectedSaleForService.customers?.full_name || 'Walk-in Customer'}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                <div>📞 <strong>Mobile:</strong> {selectedSaleForService.customers?.mobile || 'N/A'}</div>
                <div>📧 <strong>Email:</strong> {selectedSaleForService.customers?.email || 'N/A'}</div>
                <div>📍 <strong>Address:</strong> {selectedSaleForService.customers?.address || 'N/A'}</div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)', maxHeight: '200px', overflowY: 'auto' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>Service Timeline</h3>
              {vehicleServices.filter(s => s.sale_id === selectedSaleForService.id).length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No services logged yet.</div>
              ) : (
                vehicleServices.filter(s => s.sale_id === selectedSaleForService.id).map(srv => (
                  <div key={srv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{new Date(srv.service_due_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{srv.notes}</div>
                    </div>
                    <span className={`status-badge ${srv.status === 'Completed' ? 'won' : srv.status === 'Overdue' ? 'cold' : 'warm'}`}>{srv.status}</span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>Log New Service</h3>
              <div className="form-group">
                <label className="form-label">Service Due Date</label>
                <input type="date" className="form-input" value={serviceForm.due_date} onChange={e => setServiceForm({...serviceForm, due_date: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Service Type</label>
                  <select className="form-input" value={serviceForm.type} onChange={e => setServiceForm({...serviceForm, type: e.target.value})}>
                    <option value="Free">Free Service</option>
                    <option value="Paid">Paid Service</option>
                    <option value="Warranty">Warranty Repair</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select className="form-input" value={serviceForm.status} onChange={e => setServiceForm({...serviceForm, status: e.target.value})}>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Assign Mechanics (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {(() => {
                     const validMechanics = mechanicsList.filter(m => m.division === selectedSaleForService.division);
                     if (validMechanics.length === 0) return <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No mechanics available in {selectedSaleForService.division} division.</span>;
                     return validMechanics.map(m => (
                      <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: m.status !== 'Available' ? 'not-allowed' : 'pointer', opacity: m.status !== 'Available' ? 0.6 : 1 }}>
                        <input 
                          type="checkbox" 
                          checked={selectedMechanicIds.includes(m.id)}
                          onChange={() => handleMechanicSelection(m.id)}
                          disabled={m.status !== 'Available'}
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{m.full_name} <span style={{ fontSize: '0.7rem', color: m.status === 'Available' ? 'var(--accent-success)' : 'var(--accent-warning)' }}>({m.status})</span></span>
                      </label>
                     ));
                  })()}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Details / Notes</label>
                <input type="text" className="form-input" placeholder="e.g. Oil change, 1st Free Service..." value={serviceForm.notes} onChange={e => setServiceForm({...serviceForm, notes: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Service</button>
                <button type="button" className="btn" onClick={() => setIsServiceModalOpen(false)} style={{ flex: 1, background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Profile Modal */}
      {isAdminProfileModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAdminProfileModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Edit Admin Profile</h2>
              <button onClick={() => setIsAdminProfileModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAdminProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  {adminProfileForm.photo_url ? (
                    <img src={adminProfileForm.photo_url} alt="Profile" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
                  ) : (
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '2px solid var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'var(--text-primary)', fontWeight: 'bold' }}>
                      {adminProfileForm.full_name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <label style={{ position: 'absolute', bottom: '0', right: '0', background: 'var(--accent-primary)', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                    <Camera size={16} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAdminImageUpload} />
                  </label>
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Click camera icon to update photo</div>
              </div>

              <div>
                <label className="form-label">Full Name</label>
                <input type="text" className="form-input" value={adminProfileForm.full_name} onChange={e => setAdminProfileForm({...adminProfileForm, full_name: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input type="text" className="form-input" value={adminProfileForm.password} onChange={e => setAdminProfileForm({...adminProfileForm, password: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAdminProfileModalOpen(false)} className="btn" style={{ background: 'var(--bg-tertiary)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Mechanic Modal */}
      {(isMechanicModalOpen || isEditMechanicModalOpen) && (
        <div className="modal-overlay" onClick={() => { setIsMechanicModalOpen(false); setIsEditMechanicModalOpen(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                   {isEditMechanicModalOpen ? <Edit size={24} /> : <Wrench size={24} />}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {isEditMechanicModalOpen ? 'Edit Mechanic Profile' : 'Add New Mechanic'}
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {isEditMechanicModalOpen ? 'Update details and photo.' : 'Register a mechanic for the service center.'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setIsMechanicModalOpen(false); setIsEditMechanicModalOpen(false); }} style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '50%', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={isEditMechanicModalOpen ? handleEditMechanic : handleSaveMechanic} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  {mechanicForm.photo_url ? (
                    <img src={mechanicForm.photo_url} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <Camera size={24} />
                    </div>
                  )}
                  <label style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: 'var(--accent-primary)', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                    <Edit size={12} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMechanicImageUpload} />
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label">Full Name <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <input type="text" className="form-input" placeholder="Mechanic Name" value={mechanicForm.full_name} onChange={e => setMechanicForm({...mechanicForm, full_name: e.target.value})} required />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Email / Login ID <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                  <input type="email" className="form-input" placeholder="mechanic@shaancars.com" value={mechanicForm.email} onChange={e => setMechanicForm({...mechanicForm, email: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Mobile</label>
                  <input type="text" className="form-input" placeholder="9876543210" value={mechanicForm.mobile} onChange={e => setMechanicForm({...mechanicForm, mobile: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Division <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                  <select className="form-input" value={mechanicForm.division || 'Arena'} onChange={e => setMechanicForm({...mechanicForm, division: e.target.value})} required>
                    <option value="Arena">Arena</option>
                    <option value="Nexa">Nexa</option>
                    <option value="True Value">True Value</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Specialization</label>
                  <input type="text" className="form-input" placeholder="e.g. Engine, Body, General" value={mechanicForm.specialization} onChange={e => setMechanicForm({...mechanicForm, specialization: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Assigned Password (Optional)</label>
                  <input type="text" className="form-input" placeholder="Default: 123456" value={mechanicForm.assigned_password} onChange={e => setMechanicForm({...mechanicForm, assigned_password: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn" onClick={() => { setIsMechanicModalOpen(false); setIsEditMechanicModalOpen(false); }} style={{ flex: 1, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{isEditMechanicModalOpen ? 'Save Changes' : 'Add Mechanic'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
