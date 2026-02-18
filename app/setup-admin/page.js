/**
 * @page Setup Admin (One-time)
 * @route /setup-admin
 * @description Simple page to add an admin user (one-time setup)
 */
"use client";
import React, { useState } from 'react';

const SetupAdminPage = () => {
  const [email, setEmail] = useState('amankumarschool7@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({ success: true, message: data.message || 'Admin added successfully!' });
      } else {
        setResult({ success: false, message: data.error || 'Failed to add admin' });
      }
    } catch (error) {
      setResult({ success: false, message: 'Error: ' + error.message });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#111]/80 backdrop-blur-sm rounded-2xl p-8 border border-[#333]">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Setup Admin Access</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Adding Admin...
              </span>
            ) : (
              'Add Admin'
            )}
          </button>
        </form>

        {result && (
          <div className={`mt-4 p-4 rounded-lg ${
            result.success 
              ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}>
            {result.message}
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500 text-center">
          Note: This is a one-time setup page. After adding admins, you can manage them from the Admin Settings page.
        </p>
      </div>
    </div>
  );
};

export default SetupAdminPage;
