
/**
 * @page Admin Submissions
 * @route /admin/submissions
 * @description View and manage all student submissions
 */
"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

const AdminSubmissionsPage = () => {
  const { user, isLoaded } = useUser();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  // Fetch all submissions
  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/submissions?all=true');
      const data = await response.json();
      setSubmissions(data.submissions || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      checkAdminAccess();
      fetchSubmissions();
    }
  }, [isLoaded, user]);

  const handleDelete = async (id, fileName, type) => {
    const message = type === 'reset'
        ? `Are you sure you want to RESET the submission for "${fileName}"? The student will be allowed to submit again.`
        : `Are you sure you want to PERMANENTLY DELETE the submission "${fileName}"?`;

    if (!confirm(message)) {
        return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/submissions?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSubmissions(prev => prev.filter(sub => sub._id !== id));
      } else {
        alert('Failed to delete submission');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      alert('Error deleting submission');
    }
    setDeletingId(null);
  };

  if (!isLoaded || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user || isAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-400">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Submissions</h1>
          <p className="text-gray-400 text-sm">Manage student file submissions</p>
        </div>
        <button 
            onClick={fetchSubmissions}
            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white"
            title="Refresh"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        </button>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-purple-500/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-gray-400 font-medium text-sm">Student</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-sm">Event</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-sm">File</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-sm">Date</th>
                <th className="px-6 py-4 text-gray-400 font-medium text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-500/10">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No submissions found
                  </td>
                </tr>
              ) : (
                submissions.map((submission) => (
                  <tr key={submission._id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{submission.userName}</div>
                      <div className="text-gray-500 text-xs">{submission.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-blue-300 text-sm font-medium">{submission.eventName || `Event #${submission.eventId}`}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-gray-300 text-sm truncate max-w-[200px]" title={submission.fileName}>
                            {submission.fileName}
                        </span>
                        <span className="text-gray-500 text-xs">
                            ({(submission.fileSize / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={`/api/download?id=${submission._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                          title="Download File"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                          </svg>
                        </a>
                        <button
                          onClick={() => handleDelete(submission._id, submission.fileName, 'reset')}
                          disabled={deletingId === submission._id}
                          className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                          title="Allow Re-submit"
                        >
                           {deletingId === submission._id ? (
                                <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                           )}
                           Reset
                        </button>
                        <button
                          onClick={() => handleDelete(submission._id, submission.fileName, 'delete')}
                          disabled={deletingId === submission._id}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                          title="Permanently Delete"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                           </svg>
                           Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSubmissionsPage;
