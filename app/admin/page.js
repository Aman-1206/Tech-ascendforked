/**
 * @page Admin Dashboard
 * @route /admin
 * @description Main admin panel with overview stats and quick actions
 */
"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import AdminLayout from '@/components/AdminLayout';

// Function to export registrations to Excel
const exportToExcel = (registrations) => {
  const excelData = registrations.map((reg, index) => ({
    'S.No': index + 1,
    'Name': reg.name,
    'Email': reg.email,
    'Course': reg.course || '-',
    'Year': reg.year || '-',
    'College': reg.college || '-',
    'Phone': reg.phone || '-',
    'Event': reg.eventName,
    'Registered On': new Date(reg.registeredAt).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 35 },
    { wch: 15 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  const date = new Date().toISOString().split('T')[0];
  const filename = `TechAscend_Registrations_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
};

const AdminPage = () => {
  const { user, isLoaded } = useUser();
  const [registrations, setRegistrations] = useState([]); // This will now hold RECENT registrations
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [events, setEvents] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false); // New state for export loading
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  
  // Settings state
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Function to fetch registrations stats (fast)
  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/registrations?dashboard=true');
      
      if (response.status === 401 || response.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        // Update state with stats
        if (data.stats) {
          setTotalRegistrations(data.stats.total);
          setRegistrations(data.stats.recent || []);
        }
        setIsAdmin(true);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching registration stats:', error);
    }
    setLoading(false);
  };

  // Function to fetch full data for export (on demand)
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/registrations');
      if (response.ok) {
        const data = await response.json();
        exportToExcel(data.registrations || []);
      } else {
        alert('Failed to fetch data for export');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data');
    }
    setExporting(false);
  };

  // Function to fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents((data.events || []).sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  // Function to fetch settings
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setRegistrationOpen(data.registrationOpen);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Function to fetch admins
  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admins');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  // Toggle registration status
  const toggleRegistrationStatus = async () => {
    setUpdatingSettings(true);
    try {
      const newValue = !registrationOpen;
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationOpen: newValue }),
      });
      
      if (response.ok) {
        setRegistrationOpen(newValue);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
    setUpdatingSettings(false);
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardStats();
      fetchEvents();
      fetchAdmins();
      fetchSettings();
      
      // Auto-refresh every 10 seconds
      const interval = setInterval(() => {
        if (isAdmin) {
          fetchDashboardStats();
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isLoaded, user, isAdmin]);

  // Get today's registrations - REMOVED for optimization
  // const todayRegistrations = registrations.filter(r => { ... });

  // Get active events (not ended)
  const activeEvents = events.filter(e => {
    if (!e.deadline) return true;
    return new Date(e.deadline) >= new Date();
  });

  // Loading state
  if (!isLoaded || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⛔</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don&apos;t have permission to access this page.</p>
          <Link href="/" className="text-orange-400 hover:text-orange-300">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-gray-400 text-sm">Welcome back, {user.firstName || 'Admin'}!</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {/* Registration Status Toggle */}
          <button
            onClick={toggleRegistrationStatus}
            disabled={updatingSettings}
            className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all text-xs sm:text-sm ${
              registrationOpen 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              registrationOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}></span>
            {registrationOpen ? 'Registration Open' : 'Registration Closed'}
          </button>

          <span className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-400 text-xs sm:text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Live
          </span>
          {lastUpdated && (
            <span className="text-gray-500 text-xs hidden sm:inline">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-5 border border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Registrations</p>
              <p className="text-3xl font-bold text-white mt-1">{totalRegistrations}</p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        {/* <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-5 border border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Today</p>
              <p className="text-3xl font-bold text-white mt-1">-</p> 
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </div> */}

        <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-5 border border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Events</p>
              <p className="text-3xl font-bold text-white mt-1">{activeEvents.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>

        <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-5 border border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Admins</p>
              <p className="text-3xl font-bold text-white mt-1">{admins.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#333] mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link 
            href="/admin/registrations"
            className="p-4 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/20 rounded-xl text-center transition-colors"
          >
            <span className="text-2xl block mb-2">📋</span>
            <span className="text-white text-sm font-medium">View Registrations</span>
          </Link>
          <Link 
            href="/admin/events"
            className="p-4 bg-green-600/10 hover:bg-green-600/20 border border-green-500/20 rounded-xl text-center transition-colors"
          >
            <span className="text-2xl block mb-2">📅</span>
            <span className="text-white text-sm font-medium">Manage Events</span>
          </Link>
          <button 
            onClick={handleExport}
            disabled={totalRegistrations === 0 || exporting}
            className="p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
               <span className="text-2xl block mb-2 animate-spin">⏳</span>
            ) : (
               <span className="text-2xl block mb-2">📊</span>
            )}
            <span className="text-white text-sm font-medium">{exporting ? 'Exporting...' : 'Export Excel'}</span>
          </button>
          <Link 
            href="/admin/settings"
            className="p-4 bg-[#222] hover:bg-[#333] border border-[#333] rounded-xl text-center transition-colors"
          >
            <span className="text-2xl block mb-2">⚙️</span>
            <span className="text-white text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#333]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Registrations</h2>
          <Link href="/admin/registrations" className="text-orange-400 hover:text-orange-300 text-sm">
            View All →
          </Link>
        </div>
        
        {registrations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No registrations yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registrations.slice(0, 5).map((reg) => (
              <div 
                key={reg.id}
                className="flex items-center justify-between p-3 bg-[#222]/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <span className="text-orange-400 font-medium">
                      {reg.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{reg.name}</p>
                    <p className="text-gray-400 text-xs">{reg.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-orange-500/10 text-orange-300 rounded-lg text-xs">
                    {reg.eventName}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPage;