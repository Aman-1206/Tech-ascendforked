/**
 * @page Admin Events Management
 * @route /admin/events
 * @description Manage events - create, edit, delete events
 */
"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

const AdminEventsPage = () => {
  const { user, isLoaded } = useUser();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);

  // Event editing state
  const [editModal, setEditModal] = useState({ show: false, event: null });
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingMobileImage, setUploadingMobileImage] = useState(false);
  const [mobileImagePreview, setMobileImagePreview] = useState(null);
  const [deleteEventModal, setDeleteEventModal] = useState({ show: false, event: null });
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [linkedQuizzes, setLinkedQuizzes] = useState([]);

  // Check admin access
  const checkAdminAccess = async () => {
    try {
      const response = await fetch('/api/registrations');
      if (response.status === 401 || response.status === 403) {
        setIsAdmin(false);
      } else if (response.ok) {
        setIsAdmin(true);
      }
    } catch (error) {
      setIsAdmin(false);
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
      checkAdminAccess();
      fetchEvents();
    }
  }, [isLoaded, user]);

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

  // Open edit modal
  const openEditModal = async (event = null) => {
    if (event) {
      setEditForm({
        id: event.id,
        name: event.name || '',
        tagline: event.tagline || '',
        description: event.description || '',
        image: event.image || '📅',
        imagePath: event.imagePath || null,
        mobileImagePath: event.mobileImagePath || null,
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
        highlights: event.highlights || [],
        communityLink: event.communityLink || '',
        // Submission fields
        problemStatement: event.problemStatement || '',
        submissionType: event.submissionType || 'none',
        driveLink: event.driveLink || '',
        submissionDeadline: event.submissionDeadline || '',
        maxFileSize: event.maxFileSize || 10,
      });
      setImagePreview(event.imagePath || null);
      setMobileImagePreview(event.mobileImagePath || null);
    } else {
      setEditForm({
        name: '',
        tagline: '',
        description: '',
        image: '📅',
        imagePath: null,
        mobileImagePath: null,
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
        highlights: [],
        communityLink: '',
        // Submission fields
        problemStatement: '',
        submissionType: 'none',
        driveLink: '',
        submissionDeadline: '',
        maxFileSize: 10,
      });
      setImagePreview(null);
      setMobileImagePreview(null);
    }
    setEditModal({ show: true, event });

    // Fetch linked quizzes for existing events
    if (event && event.id) {
      try {
        const res = await fetch(`/api/quiz?admin=true&eventId=${event.id}`);
        if (res.ok) {
          const data = await res.json();
          setLinkedQuizzes(data.quizzes || []);
        } else {
          setLinkedQuizzes([]);
        }
      } catch (err) {
        setLinkedQuizzes([]);
      }
    } else {
      setLinkedQuizzes([]);
    }
  };

  // Handle form input change
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle array field change
  const handleArrayChange = (field, index, value) => {
    setEditForm(prev => {
      const arr = [...(prev[field] || [])];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (field) => {
    setEditForm(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setEditForm(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Image compression helper
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Max dimensions
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.85 quality (high quality)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        };
      };
    });
  };

  // Handle image upload
  const handleImageUpload = async (e, type = 'desktop') => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      if (type === 'mobile') {
        setMobileImagePreview(e.target.result);
      } else {
        setImagePreview(e.target.result);
      }
    };
    reader.readAsDataURL(file);

    if (type === 'mobile') {
      setUploadingMobileImage(true);
    } else {
      setUploadingImage(true);
    }

    try {
      // Compress image before upload
      const compressedDataUrl = await compressImage(file);

      // Convert base64 back to blob for upload if needed, 
      // but our API expects a file in formData.
      // Let's convert the dataURL to a Blob
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();

      // Validating file size (1MB limit)
      if (blob.size > 1024 * 1024) {
        alert('Image is too large. Please use a smaller image (under 1MB after compression).');
        if (type === 'mobile') setUploadingMobileImage(false);
        else setUploadingImage(false);
        return;
      }

      const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', compressedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        if (type === 'mobile') {
          setEditForm(prev => ({ ...prev, mobileImagePath: data.imagePath }));
        } else {
          setEditForm(prev => ({ ...prev, imagePath: data.imagePath }));
        }
      } else {
        alert('Image upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
    }
    if (type === 'mobile') setUploadingMobileImage(false);
    else setUploadingImage(false);
  };

  // Save event
  const handleSaveEvent = async () => {
    setSaving(true);
    try {
      // Auto-generate registrationDeadline display string from deadline ISO value
      const deadlineDisplay = editForm.deadline
        ? new Date(editForm.deadline).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : editForm.registrationDeadline || '';

      const cleanedForm = {
        ...editForm,
        registrationDeadline: deadlineDisplay,
        prizes: editForm.prizes?.filter(p => p.trim()) || [],
        requirements: editForm.requirements?.filter(r => r.trim()) || [],
        highlights: editForm.highlights?.filter(h => h.trim()) || [],
        communityLink: editForm.communityLink || '',
        // Ensure submission fields are included
        problemStatement: editForm.problemStatement || '',
        submissionType: editForm.submissionType || 'none',
        driveLink: editForm.driveLink || '',
        submissionDeadline: editForm.submissionDeadline || '',
        maxFileSize: editForm.maxFileSize || 10,
      };

      console.log('Saving event with data:', cleanedForm);

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
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Events</h1>
          <p className="text-gray-400 text-xs sm:text-sm">{events.length} total</p>
        </div>
        <button
          onClick={() => openEditModal(null)}
          className="p-2 sm:px-4 sm:py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">Add Event</span>
        </button>
      </div>

      {/* Events Grid */}
      <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-3 sm:p-6 border border-[#333]">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📅</span>
            </div>
            <p className="text-gray-400 mb-4">No events found</p>
            <button
              onClick={() => openEditModal(null)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              Create First Event
            </button>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-2 sm:p-4 bg-[#222]/50 rounded-xl border border-[#333] hover:border-orange-500/30 transition-colors gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  {/* Hide image on mobile */}
                  <div className="hidden sm:flex w-12 h-12 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl items-center justify-center overflow-hidden flex-shrink-0">
                    {event.imagePath ? (
                      <img src={event.imagePath} alt={event.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-xl">{event.image}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 mb-0.5">
                      <h3 className="text-white font-semibold text-sm sm:text-base truncate">{event.name}</h3>
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
                    {/* Hide date info on mobile */}
                    <p className="text-gray-400 text-xs hidden sm:block">📅 {event.date} • {event.mode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditModal(event)}
                    className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
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

      {/* Delete Event Modal */}
      {deleteEventModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] rounded-2xl p-6 max-w-md w-full border border-[#333]">
            <h3 className="text-xl font-bold text-white mb-2">Delete Event</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete &quot;{deleteEventModal.event?.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEventModal({ show: false, event: null })}
                className="flex-1 px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deletingEvent}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingEvent ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#111] rounded-2xl p-6 max-w-2xl w-full border border-[#333] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {editForm.id ? 'Edit Event' : 'Add New Event'}
              </h3>
              <button
                onClick={() => setEditModal({ show: false, event: null })}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Event Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-[#222]/50 rounded-xl flex items-center justify-center overflow-hidden border border-[#333]">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{editForm.image || '📅'}</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'desktop')}
                      className="hidden"
                      id="imageUpload"
                    />
                    <label
                      htmlFor="imageUpload"
                      className="cursor-pointer px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </label>
                    <p className="text-gray-500 text-xs mt-1">PNG, JPG, GIF up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Mobile Image Upload */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Mobile Image (Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-[#222]/50 rounded-xl flex items-center justify-center overflow-hidden border border-[#333]">
                    {mobileImagePreview ? (
                      <img src={mobileImagePreview} alt="Mobile Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl text-gray-600">📱</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'mobile')}
                      className="hidden"
                      id="mobileImageUpload"
                    />
                    <label
                      htmlFor="mobileImageUpload"
                      className="cursor-pointer px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2 text-sm"
                    >
                      {uploadingMobileImage ? 'Uploading...' : 'Upload Mobile Image'}
                    </label>
                    <p className="text-gray-500 text-xs mt-1">Optimized for mobile view</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Event Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Enter event name"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., Competition, Workshop"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Tagline</label>
                <input
                  type="text"
                  value={editForm.tagline}
                  onChange={(e) => handleFormChange('tagline', e.target.value)}
                  className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  placeholder="Short tagline for the event"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 min-h-[100px]"
                  placeholder="Detailed event description"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date</label>
                  <input
                    type="text"
                    value={editForm.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., March 15, 2026"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Time</label>
                  <input
                    type="text"
                    value={editForm.time}
                    onChange={(e) => handleFormChange('time', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., 10:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Duration</label>
                  <input
                    type="text"
                    value={editForm.duration}
                    onChange={(e) => handleFormChange('duration', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., 3 hours"
                  />
                </div>
              </div>

              {/* Mode & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Mode</label>
                  <select
                    value={editForm.mode}
                    onChange={(e) => handleFormChange('mode', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Offline">Offline</option>
                    <option value="Online">Online</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => handleFormChange('location', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="Event venue"
                  />
                </div>
              </div>

              {/* Team Size & Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Team Size</label>
                  <input
                    type="text"
                    value={editForm.teamSize}
                    onChange={(e) => handleFormChange('teamSize', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="e.g., Individual or 2-4"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Registration Deadline</label>
                  <input
                    type="datetime-local"
                    value={editForm.deadline}
                    onChange={(e) => handleFormChange('deadline', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Registration Status */}
              <div className="flex items-center justify-between p-4 bg-[#222]/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">Registration Open</p>
                  <p className="text-gray-400 text-sm">Allow users to register for this event</p>
                </div>
                <button
                  onClick={() => handleFormChange('registrationOpen', !editForm.registrationOpen)}
                  className={`w-12 h-6 rounded-full transition-colors ${editForm.registrationOpen ? 'bg-green-500' : 'bg-[#444]'
                    }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${editForm.registrationOpen ? 'translate-x-6' : 'translate-x-0.5'
                    }`}></div>
                </button>
              </div>

              {/* Prizes */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Prizes</label>
                {editForm.prizes?.map((prize, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={prize}
                      onChange={(e) => handleArrayChange('prizes', index, e.target.value)}
                      className="flex-1 bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 text-sm"
                      placeholder="Prize description"
                    />
                    <button
                      onClick={() => removeArrayItem('prizes', index)}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('prizes')}
                  className="text-orange-400 hover:text-orange-300 text-sm"
                >
                  + Add Prize
                </button>
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Requirements</label>
                {editForm.requirements?.map((req, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={req}
                      onChange={(e) => handleArrayChange('requirements', index, e.target.value)}
                      className="flex-1 bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 text-sm"
                      placeholder="Requirement"
                    />
                    <button
                      onClick={() => removeArrayItem('requirements', index)}
                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addArrayItem('requirements')}
                  className="text-orange-400 hover:text-orange-300 text-sm"
                >
                  + Add Requirement
                </button>
              </div>

              {/* Community Link */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Community Link (WhatsApp/Discord)</label>
                <div className="flex items-center gap-2">
                  <div className="bg-[#222]/50 border border-[#333] border-r-0 rounded-l-xl px-3 py-2 text-gray-400">
                    🔗
                  </div>
                  <input
                    type="url"
                    value={editForm.communityLink || ''}
                    onChange={(e) => handleFormChange('communityLink', e.target.value)}
                    className="flex-1 bg-[#222]/50 border border-[#333] rounded-r-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    placeholder="https://chat.whatsapp.com/..."
                  />
                </div>
              </div>

              {/* Submission Settings Section */}
              <div className="border-t border-[#333] pt-4 mt-4">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Submission Settings
                  <span className="text-gray-500 text-xs font-normal">(shown after registration closes)</span>
                </h4>

                {/* Problem Statement */}
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Problem Statement / Task</label>
                  <textarea
                    value={editForm.problemStatement || ''}
                    onChange={(e) => handleFormChange('problemStatement', e.target.value)}
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 min-h-[100px]"
                    placeholder="Enter the problem statement or task that participants need to complete..."
                  />
                </div>

                {/* Submission Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Submission Type</label>
                    <select
                      value={editForm.submissionType || 'none'}
                      onChange={(e) => handleFormChange('submissionType', e.target.value)}
                      className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="none">No Submissions</option>
                      <option value="file">File Upload Only</option>
                      <option value="drive">Google Drive Link Only</option>
                      <option value="both">Both (File & Drive)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Submission Deadline</label>
                    <input
                      type="datetime-local"
                      value={editForm.submissionDeadline || ''}
                      onChange={(e) => handleFormChange('submissionDeadline', e.target.value)}
                      className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Drive Link (shown when drive or both is selected) */}
                {(editForm.submissionType === 'drive' || editForm.submissionType === 'both') && (
                  <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-2">Google Drive Folder Link</label>
                    <input
                      type="url"
                      value={editForm.driveLink || ''}
                      onChange={(e) => handleFormChange('driveLink', e.target.value)}
                      className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      placeholder="https://drive.google.com/drive/folders/..."
                    />
                    <p className="text-gray-500 text-xs mt-1">Participants will be directed to this link to upload their submissions</p>
                  </div>
                )}

                {/* Max File Size (shown when file upload is enabled) */}
                {(editForm.submissionType === 'file' || editForm.submissionType === 'both') && (
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Max File Size (MB)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editForm.maxFileSize || 10}
                      onChange={(e) => handleFormChange('maxFileSize', parseInt(e.target.value) || 10)}
                      className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      placeholder="10"
                    />
                    <p className="text-gray-500 text-xs mt-1">Maximum file size participants can upload</p>
                  </div>
                )}
              </div>

              {/* Linked Quizzes Section (only when editing existing event) */}
              {editForm.id && (
                <div className="border-t border-[#333] pt-4 mt-4">
                  <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Linked Quizzes
                  </h4>

                  {linkedQuizzes.length === 0 ? (
                    <div className="bg-[#222]/50 rounded-xl p-4 text-center">
                      <p className="text-gray-500 text-sm mb-2">No quizzes linked to this event</p>
                      <Link
                        href="/admin/quiz"
                        className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                      >
                        + Create Quiz in Admin Panel →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {linkedQuizzes.map((quiz) => {
                        const now = new Date();
                        const hasStarted = !quiz.startTime || now >= new Date(quiz.startTime);
                        const hasEnded = quiz.endTime && now > new Date(quiz.endTime);
                        const isLive = hasStarted && !hasEnded;

                        return (
                          <div key={quiz._id} className="bg-[#222]/50 rounded-xl p-4 border border-[#333]">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-white font-medium text-sm">{quiz.title}</h5>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                hasEnded
                                  ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                  : isLive
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {hasEnded ? 'Ended' : isLive ? 'Live' : 'Scheduled'}
                              </span>
                            </div>

                            {/* Time info */}
                            <div className="text-gray-500 text-xs space-y-1 mb-3">
                              {quiz.startTime && (
                                <p>🕐 Start: {new Date(quiz.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              )}
                              {quiz.endTime && (
                                <p>🕐 End: {new Date(quiz.endTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                              )}
                            </div>

                            {/* Quiz link */}
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/quiz/${quiz._id}`}
                                target="_blank"
                                className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-lg transition-colors border border-purple-500/20"
                              >
                                Open Quiz ↗
                              </Link>
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/quiz/${quiz._id}`;
                                  navigator.clipboard.writeText(url);
                                  alert('Quiz link copied!');
                                }}
                                className="text-xs px-3 py-1.5 bg-[#333] text-gray-300 hover:bg-[#444] rounded-lg transition-colors"
                              >
                                📋 Copy Link
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <Link
                        href="/admin/quiz"
                        className="block text-center text-purple-400 hover:text-purple-300 text-sm font-medium mt-2"
                      >
                        Manage Quizzes →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-[#333]">
              <button
                onClick={() => setEditModal({ show: false, event: null })}
                className="flex-1 px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded-xl font-medium transition-colors"
                title="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || !editForm.name}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Event'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminEventsPage;
