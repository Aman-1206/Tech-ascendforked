"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// Function to export registrations to Excel
const exportToExcel = (registrations) => {
  // Prepare data for Excel
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

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 25 },  // Name
    { wch: 35 },  // Email
    { wch: 15 },  // Event
    { wch: 25 }   // Registered On
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const filename = `TechAscend_Registrations_${date}.xlsx`;

  // Download the file
  XLSX.writeFile(wb, filename);
};

const AdminPage = () => {
  const { user, isLoaded } = useUser();
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, registration: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteEventModal, setDeleteEventModal] = useState({ show: false, event: null });
  const [deletingEvent, setDeletingEvent] = useState(false);
  
  // Settings state
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  
  // Admin verification state - verified by API response
  const [isAdmin, setIsAdmin] = useState(null); // null = checking, true = admin, false = not admin
  
  // Event editing state
  const [editModal, setEditModal] = useState({ show: false, event: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Admin management state
  const [admins, setAdmins] = useState([]);
  const [superAdmin, setSuperAdmin] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [addAdminModal, setAddAdminModal] = useState({ show: false, email: '' });
  const [removeAdminModal, setRemoveAdminModal] = useState({ show: false, email: '' });

  // Handle delete registration
  const handleDelete = async () => {
    if (!deleteModal.registration) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/registrations?id=${deleteModal.registration.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setRegistrations(prev => prev.filter(r => r.id !== deleteModal.registration.id));
        setDeleteModal({ show: false, registration: null });
      }
    } catch (error) {
      console.error('Error deleting registration:', error);
    }
    setDeleting(false);
  };

  // Handle delete event
  const handleDeleteEvent = async () => {
    if (!deleteEventModal.event) return;
    
    setDeletingEvent(true);
    try {
      const response = await fetch(`/api/events?id=${deleteEventModal.event.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setEvents(prev => prev.filter(e => e.id !== deleteEventModal.event.id));
        setDeleteEventModal({ show: false, event: null });
      } else {
        const data = await response.json();
        alert(`Failed to delete event: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
    setDeletingEvent(false);
  };

  // Function to fetch registrations (also verifies admin access)
  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/registrations');
      
      // If we get 401 or 403, user is not an admin
      if (response.status === 401 || response.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.registrations || []);
        setIsAdmin(true);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
    setLoading(false);
  };

  // Function to fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      // Sort by ID descending (newest first)
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

  // Function to fetch admins
  const fetchAdmins = async () => {
    try {
      const response = await fetch('/api/admins');
      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
        setSuperAdmin(data.superAdmin || '');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  // Show add admin confirmation
  const showAddAdminConfirm = (e) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setAddAdminModal({ show: true, email: newAdminEmail.trim() });
  };

  // Confirm adding new admin
  const confirmAddAdmin = async () => {
    const email = addAdminModal.email;
    setAddAdminModal({ show: false, email: '' });
    setAddingAdmin(true);
    setAdminError('');
    
    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAdmins(data.admins || []);
        setNewAdminEmail('');
      } else {
        setAdminError(data.error || 'Failed to add admin');
      }
    } catch (error) {
      setAdminError('Failed to add admin');
    }
    setAddingAdmin(false);
  };

  // Show remove admin confirmation
  const showRemoveAdminConfirm = (email) => {
    setRemoveAdminModal({ show: true, email });
  };

  // Confirm removing admin
  const confirmRemoveAdmin = async () => {
    const email = removeAdminModal.email;
    setRemoveAdminModal({ show: false, email: '' });
    setRemovingAdmin(email);
    setAdminError('');
    
    try {
      const response = await fetch(`/api/admins?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAdmins(data.admins || []);
      } else {
        setAdminError(data.error || 'Failed to remove admin');
      }
    } catch (error) {
      setAdminError('Failed to remove admin');
    }
    setRemovingAdmin(null);
  };

  // Initial fetch and auto-refresh every 5 seconds
  useEffect(() => {
    if (isLoaded && user) {
      fetchRegistrations();
      fetchEvents();
      fetchAdmins();
      fetchSettings();
      
      // Auto-refresh every 5 seconds
      const interval = setInterval(() => {
        if (isAdmin) {
          fetchRegistrations();
        }
      }, 5000);

      // Cleanup on unmount
      return () => clearInterval(interval);
    }
  }, [isLoaded, user, isAdmin]);

  // Open edit modal (or add new event if event is null)
  const openEditModal = (event = null) => {
    if (event) {
      setEditForm({
        id: event.id,
        name: event.name || '',
        tagline: event.tagline || '',
        description: event.description || '',
        image: event.image || '📅',
        imagePath: event.imagePath || null,
        date: event.date || '',
        time: event.time || '',
        duration: event.duration || '',
        mode: event.mode || 'Offline',
        location: event.location || '',
        category: event.category || '',
        teamSize: event.teamSize || '',
        registrationDeadline: event.registrationDeadline || '',
        deadline: event.deadline || '',
        registrationOpen: event.registrationOpen !== undefined ? event.registrationOpen : true,
        prizes: event.prizes || [],
        requirements: event.requirements || [],
        highlights: event.highlights || []
      });
      setImagePreview(event.imagePath || null);
    } else {
      // New event defaults
      setEditForm({
        name: '',
        tagline: '',
        description: '',
        image: '📅',
        imagePath: null,
        date: '',
        time: '',
        duration: '',
        mode: 'Offline',
        location: '',
        category: '',
        teamSize: '',
        registrationDeadline: '',
        deadline: '',
        registrationOpen: true,
        prizes: [],
        requirements: [],
        highlights: []
      });
      setImagePreview(null);
    }
    setEditModal({ show: true, event });
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle array field change (prizes, requirements, highlights)
  const handleArrayChange = (field, index, value) => {
    setEditForm(prev => {
      const arr = [...(prev[field] || [])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  // Add item to array field
  const addArrayItem = (field) => {
    setEditForm(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  // Remove item from array field
  const removeArrayItem = (field, index) => {
    setEditForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setEditForm(prev => ({ ...prev, imagePath: data.imagePath }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    setUploadingImage(false);
  };

  // Save event changes
  const handleSaveEvent = async () => {
    setSaving(true);
    try {
      // Filter out empty array items
      const cleanedForm = {
        ...editForm,
        prizes: editForm.prizes.filter(p => p.trim()),
        requirements: editForm.requirements.filter(r => r.trim()),
        highlights: editForm.highlights.filter(h => h.trim())
      };

      const method = editForm.id ? 'PUT' : 'POST';
      const response = await fetch('/api/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedForm),
      });

      if (response.ok) {
        await fetchEvents();
        setEditModal({ show: false, event: null });
      } else {
        const data = await response.json();
        alert(`Failed to save event: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
    setSaving(false);
  };

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Please sign in to access this page.</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Check if still verifying admin status
  const userEmail = user.primaryEmailAddress?.emailAddress;
  
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not authorized (API returned 401/403)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⛔</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-2">You don&apos;t have permission to access this page.</p>
          <p className="text-gray-500 text-sm mb-6">Logged in as: {userEmail}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user.firstName || 'Admin'}!</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Registration Status Toggle */}
            <div className="flex items-center bg-slate-800/50 rounded-full p-1 border border-purple-500/20">
              <button
                onClick={toggleRegistrationStatus}
                disabled={updatingSettings}
                className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium transition-all text-xs sm:text-sm sm:px-4 ${
                  registrationOpen 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  registrationOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></span>
                <span className="hidden sm:inline">{registrationOpen ? 'Registration Open' : 'Registration Closed'}</span>
                <span className="sm:hidden">{registrationOpen ? 'Open' : 'Closed'}</span>
              </button>
            </div>

            <span className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs sm:text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="hidden sm:inline">Live Updates</span>
              <span className="sm:hidden">Live</span>
            </span>
            {lastUpdated && (
              <span className="text-gray-500 text-xs hidden sm:inline">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Registrations</p>
                <p className="text-3xl font-bold text-white mt-1">{registrations.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Events</p>
                <p className="text-3xl font-bold text-white mt-1">{events.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </div>

          <Link 
            href="/admin/registrations"
            className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm group-hover:text-purple-300 transition-colors">Event Registrations</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {registrations.length}
                </p>
                <p className="text-purple-400 text-xs mt-1">Click to view by event →</p>
              </div>
              <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link 
              href="/events"
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors text-center text-sm sm:text-base"
            >
              View Events
            </Link>
            <button 
              onClick={() => exportToExcel(registrations)}
              disabled={registrations.length === 0}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Manage Admins Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Manage Admins</h2>
          
          {/* Add Admin Form */}
          <form onSubmit={showAddAdminConfirm} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Enter email to add as admin..."
              className="flex-1 bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={addingAdmin || !newAdminEmail.trim()}
              className="px-4 sm:px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {addingAdmin ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add Admin
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {adminError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {adminError}
            </div>
          )}

          {/* Admins List */}
          <div className="space-y-3">
            {admins.map((adminEmail) => (
              <div 
                key={adminEmail}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-purple-500/10 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-400 text-sm font-medium">
                      {adminEmail.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm sm:text-base truncate">{adminEmail}</p>
                    {adminEmail.toLowerCase() === superAdmin.toLowerCase() && (
                      null
                    )}
                  </div>
                </div>
                {adminEmail.toLowerCase() !== superAdmin.toLowerCase() && (
                  <button
                    onClick={() => showRemoveAdminConfirm(adminEmail)}
                    disabled={removingAdmin === adminEmail}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm self-end sm:self-auto"
                  >
                    {removingAdmin === adminEmail ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Remove
                  </button>
                )}
              </div>
            ))}
            
            {admins.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                No admins found. Add an admin above.
              </div>
            )}
          </div>
        </div>

        {/* Manage Events Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-bold text-white">Manage Events</h2>
            <button
              onClick={() => openEditModal(null)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Event
            </button>
          </div>
          
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No events found</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-slate-700/30 rounded-xl border border-purple-500/10 hover:border-purple-500/30 transition-colors gap-2"
                >
                  {/* Image - hidden on mobile */}
                  <div className="hidden sm:flex w-14 h-14 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl items-center justify-center overflow-hidden flex-shrink-0">
                    {event.imagePath ? (
                      <img src={event.imagePath} alt={event.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-2xl">{event.image}</span>
                    )}
                  </div>
                  
                  {/* Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-white font-semibold text-sm truncate">{event.name}</h3>
                      {(() => {
                        const isExpired = event.deadline && new Date(event.deadline) < new Date();
                        const isClosed = !event.registrationOpen;
                        
                        if (isExpired) {
                          return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30 flex-shrink-0">Ended</span>;
                        }
                        if (isClosed) {
                          return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">Closed</span>;
                        }
                        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">Open</span>;
                      })()}
                    </div>
                    <p className="text-gray-400 text-xs hidden sm:block">
                      📅 {event.date} • {event.mode}
                    </p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(event)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="Edit event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteEventModal({ show: true, event })}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registrations Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-4">Event Registrations</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading registrations...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-gray-400">No registrations yet</p>
              <p className="text-gray-500 text-sm">Registrations will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">#</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Course</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Year</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">College</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Registered</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, index) => (
                    <tr key={reg.id} className="border-b border-purple-500/10 hover:bg-purple-500/5 transition-colors">
                      <td className="py-4 px-4 text-gray-500">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mr-3">
                            <span className="text-purple-400 text-sm font-medium">
                              {reg.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="text-white font-medium">{reg.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300 text-sm">{reg.email}</td>
                      <td className="py-4 px-4 text-gray-300 text-sm">{reg.course || '-'}</td>
                      <td className="py-4 px-4 text-gray-300 text-sm">{reg.year || '-'}</td>
                      <td className="py-4 px-4 text-gray-300 text-sm max-w-[150px] truncate" title={reg.college}>{reg.college || '-'}</td>
                      <td className="py-4 px-4 text-gray-300 text-sm">{reg.phone || '-'}</td>
                      <td className="py-4 px-4 text-gray-400 text-sm">
                        {new Date(reg.registeredAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setDeleteModal({ show: true, registration: reg })}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete registration"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/20 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Registration?</h3>
              <p className="text-gray-400 mb-2">Are you sure you want to delete this registration?</p>
              <div className="bg-slate-700/50 rounded-lg p-3 mb-6">
                <p className="text-white font-medium">{deleteModal.registration?.name}</p>
                <p className="text-gray-400 text-sm">{deleteModal.registration?.email}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ show: false, registration: null })}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/20 p-6 max-w-3xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">{editModal.event ? 'Edit Event' : 'Add New Event'}</h3>
              <button
                onClick={() => setEditModal({ show: false, event: null })}
                className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Image Upload */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Event Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed border-purple-500/30">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-4xl">{editForm.image}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    <p className="text-gray-500 text-sm mt-2">Upload from your computer (JPG, PNG)</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Event Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Tagline</label>
                  <input
                    type="text"
                    value={editForm.tagline}
                    onChange={(e) => handleFormChange('tagline', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Date</label>
                  <input
                    type="text"
                    value={editForm.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    placeholder="e.g., March 15, 2026"
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Time</label>
                  <input
                    type="text"
                    value={editForm.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                    placeholder="e.g., 10:00 AM - 6:00 PM"
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Duration</label>
                  <input
                    type="text"
                    value={editForm.duration}
                    onChange={(e) => handleFormChange('duration', e.target.value)}
                    placeholder="e.g., 8 Hours"
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Mode, Location, Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Mode</label>
                  <select
                    value={editForm.mode}
                    onChange={(e) => handleFormChange('mode', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Team Size, Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Team Size</label>
                  <input
                    type="text"
                    value={editForm.teamSize}
                    onChange={(e) => handleFormChange('teamSize', e.target.value)}
                    placeholder="e.g., Individual or Team of 2"
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Registration Deadline</label>
                  <input
                    type="text"
                    value={editForm.registrationDeadline}
                    onChange={(e) => handleFormChange('registrationDeadline', e.target.value)}
                    placeholder="e.g., March 10, 2026"
                    className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Registration Control */}
              <div className="bg-slate-700/30 rounded-xl p-4 border border-purple-500/10">
                <h4 className="text-white font-medium mb-3">Registration Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Toggle Status */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Registration Status</label>
                    <button
                      onClick={() => handleFormChange('registrationOpen', !editForm.registrationOpen)}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                        editForm.registrationOpen ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    >
                      <span className="sr-only">Toggle registration</span>
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          editForm.registrationOpen ? 'translate-x-9' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="ml-3 text-sm text-gray-300">
                      {editForm.registrationOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  {/* Automated Deadline */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Automated Closing Time</label>
                    <input
                      type="datetime-local"
                      value={editForm.deadline}
                      onChange={(e) => handleFormChange('deadline', e.target.value)}
                      className="w-full bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to keep open indefinitely</p>
                  </div>
                </div>
              </div>

              {/* Prizes */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Prizes</label>
                {editForm.prizes.map((prize, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={prize}
                      onChange={(e) => handleArrayChange('prizes', index, e.target.value)}
                      className="flex-1 bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => removeArrayItem('prizes', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('prizes')}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Prize
                </button>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Requirements</label>
                {editForm.requirements.map((req, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                      className="flex-1 bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => removeArrayItem('requirements', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('requirements')}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Requirement
                </button>
              </div>

              {/* Highlights */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Highlights</label>
                {editForm.highlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={highlight}
                      onChange={(e) => handleArrayChange('highlights', index, e.target.value)}
                      className="flex-1 bg-slate-700/50 border border-purple-500/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      onClick={() => removeArrayItem('highlights', index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('highlights')}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Highlight
                </button>
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditModal({ show: false, event: null })}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvent}
                  disabled={saving || uploadingImage}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Event Confirmation Modal */}
      {deleteEventModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/20 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Event?</h3>
              <p className="text-gray-400 mb-2">Are you sure you want to delete this event?</p>
              <div className="bg-slate-700/50 rounded-lg p-3 mb-6">
                <p className="text-white font-medium">{deleteEventModal.event?.name}</p>
                <p className="text-gray-400 text-sm">
                  {deleteEventModal.event?.date} • {deleteEventModal.event?.mode}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteEventModal({ show: false, event: null })}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={deletingEvent}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {deletingEvent ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Admin Confirmation Modal */}
      {addAdminModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/20 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Add Admin?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to add <span className="text-white font-medium">{addAdminModal.email}</span> as an admin?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAddAdminModal({ show: false, email: '' })}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAddAdmin}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                >
                  Confirm Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Admin Confirmation Modal */}
      {removeAdminModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-purple-500/20 p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Remove Admin?</h3>
              <p className="text-gray-400 mb-6">
                Are you sure you want to remove <span className="text-white font-medium">{removeAdminModal.email}</span> from admins?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRemoveAdminModal({ show: false, email: '' })}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveAdmin}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
                >
                  Confirm Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminPage;