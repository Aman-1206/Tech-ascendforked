"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import * as XLSX from 'xlsx';

// Function to export registrations to Excel
const exportToExcel = (registrations, eventName = 'All Events') => {
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
    { wch: 10 },
    { wch: 25 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

  const date = new Date().toISOString().split('T')[0];
  const sanitizedEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `TechAscend_${sanitizedEventName}_${date}.xlsx`;

  XLSX.writeFile(wb, filename);
};

const RegistrationsPage = () => {
  const { user, isLoaded } = useUser();
  const [registrations, setRegistrations] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [isAdmin, setIsAdmin] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, registration: null });
  const [deleting, setDeleting] = useState(false);

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

  // Fetch registrations
  const fetchRegistrations = async () => {
    try {
      const response = await fetch('/api/registrations');
      
      if (response.status === 401 || response.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.registrations || []);
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
    setLoading(false);
  };

  // Fetch events
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents((data.events || []).sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchRegistrations();
      fetchEvents();
    }
  }, [isLoaded, user]);

  // Filter registrations by selected event
  const filteredRegistrations = selectedEvent === 'all' 
    ? registrations 
    : registrations.filter(r => r.eventId === parseInt(selectedEvent));

  // Get registration count per event
  const getEventRegistrationCount = (eventId) => {
    return registrations.filter(r => r.eventId === eventId).length;
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

  const selectedEventName = selectedEvent === 'all' 
    ? 'All Events' 
    : events.find(e => e.id === parseInt(selectedEvent))?.name || 'Unknown Event';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/admin"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors duration-300 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Event Registrations</h1>
          <p className="text-gray-400">View and manage registrations by event</p>
        </div>

        {/* Event Filter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {/* All Events Card */}
          <button
            onClick={() => setSelectedEvent('all')}
            className={`p-4 rounded-2xl border transition-all text-left ${
              selectedEvent === 'all'
                ? 'bg-purple-600/30 border-purple-500/50 shadow-lg shadow-purple-500/20'
                : 'bg-slate-800/50 border-purple-500/20 hover:border-purple-500/40'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <span className="text-xl">📋</span>
              </div>
              <span className="text-2xl font-bold text-white">{registrations.length}</span>
            </div>
            <p className="text-gray-300 text-sm font-medium">All Events</p>
          </button>

          {/* Individual Event Cards */}
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelectedEvent(event.id.toString())}
              className={`p-4 rounded-2xl border transition-all text-left ${
                selectedEvent === event.id.toString()
                  ? 'bg-purple-600/30 border-purple-500/50 shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800/50 border-purple-500/20 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center overflow-hidden">
                  {event.imagePath ? (
                    <img src={event.imagePath} alt={event.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-xl">{event.image}</span>
                  )}
                </div>
                <span className="text-2xl font-bold text-white">{getEventRegistrationCount(event.id)}</span>
              </div>
              <p className="text-gray-300 text-sm font-medium truncate">{event.name}</p>
            </button>
          ))}
        </div>

        {/* Actions Bar */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-purple-500/20 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-400">Showing:</span>
            <span className="text-white font-medium">{selectedEventName}</span>
            <span className="text-purple-400">({filteredRegistrations.length} registrations)</span>
          </div>
          <button 
            onClick={() => exportToExcel(filteredRegistrations, selectedEventName)}
            disabled={filteredRegistrations.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
        </div>

        {/* Registrations Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Loading registrations...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-gray-400">No registrations found for this event</p>
              <p className="text-gray-500 text-sm">Registrations will appear here when users sign up</p>
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
                    {selectedEvent === 'all' && (
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Event</th>
                    )}
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Registered</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg, index) => (
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
                      {selectedEvent === 'all' && (
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium">
                            {reg.eventName}
                          </span>
                        </td>
                      )}
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
    </div>
  );
};

export default RegistrationsPage;
