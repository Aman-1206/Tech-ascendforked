/**
 * @page Event Registration Form
 * @route /events/[id]/register
 * @description Registration form for a specific event
 */
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const RegisterPage = () => {
  const params = useParams();
  const router = useRouter();
  const eventId = parseInt(params.id);
  const [event, setEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    course: '',
    year: '',
    email: '',
    college: 'shyam_lal',
    otherCollege: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events?id=${eventId}`);
        const data = await response.json();
        setEvent(data.event || null);
      } catch (error) {
        console.error('Error fetching event:', error);
      }
      setEventLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  // Registration check is now handled during submission for security
  // or could be enabled only for authenticated users if needed.
  // For now, we rely on the backend validation.

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setAlreadyRegistered(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.course.trim()) {
      setError('Please select your course');
      return;
    }
    if (!formData.year) {
      setError('Please select your year');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (formData.college === 'other' && !formData.otherCollege.trim()) {
      setError('Please enter your college name');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsSubmitting(true);

    try {
      const collegeName = formData.college === 'shyam_lal' 
        ? 'Shyam Lal College' 
        : formData.otherCollege;

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          course: formData.course,
          year: formData.year,
          college: collegeName,
          phone: formData.phone.trim(),
          eventId: event.id,
          eventName: event.name,
        }),
      });

     const data = await response.json();

if (response.status === 409) {
  setAlreadyRegistered(true);
  setError('This email is already registered for this event');
} 
else if (response.ok) {
  setSuccess(true);
} 
else {
  setError(data.error || 'Registration failed. Please try again.');
}


  if (eventLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 flex items-center justify-center">
        <div className="text-white text-xl flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Event Not Found</h1>
          <Link href="/events" className="text-orange-400 hover:text-orange-300">
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-4">
          <div className="bg-[#111]/50 backdrop-blur-sm rounded-3xl border border-green-500/30 p-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Registration Successful!</h2>
            <p className="text-gray-400 mb-6">
              You have been registered for <span className="text-orange-400 font-medium">{event.name}</span>. 
              Check your email for confirmation.
            </p>
            <Link 
              href="/events"
              className="inline-block bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 transition-all font-outfit"
            >
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 font-outfit">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          href={`/events/${eventId}`}
          className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors duration-300 mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Event
        </Link>

        {/* Form Card */}
        <div className="bg-[#111]/50 backdrop-blur-sm rounded-3xl border border-[#333] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600/20 to-amber-600/20 p-6 text-center border-b border-[#333]">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 overflow-hidden border border-orange-500/20">
              {event.imagePath ? (
                <img src={event.imagePath} alt={event.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-4xl">{event.image}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Register for {event.name}</h1>
            <p className="text-orange-200/80">{event.date}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Course <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="Enter your course (e.g., BCA, B.Tech, MCA)"
                className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Year <span className="text-red-400">*</span>
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value="">Select your year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {alreadyRegistered && (
                <p className="text-yellow-400 text-sm mt-2">⚠️ This email is already registered for this event</p>
              )}
            </div>

            {/* College */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                College <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 bg-[#222]/50 rounded-xl cursor-pointer hover:bg-[#333]/50 transition-colors border border-transparent hover:border-[#333]">
                  <input
                    type="radio"
                    name="college"
                    value="shyam_lal"
                    checked={formData.college === 'shyam_lal'}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 accent-orange-500"
                  />
                  <span className="ml-3 text-white">Shyam Lal College</span>
                </label>
                <label className="flex items-center p-3 bg-[#222]/50 rounded-xl cursor-pointer hover:bg-[#333]/50 transition-colors border border-transparent hover:border-[#333]">
                  <input
                    type="radio"
                    name="college"
                    value="other"
                    checked={formData.college === 'other'}
                    onChange={handleChange}
                    className="w-4 h-4 text-orange-600 focus:ring-orange-500 accent-orange-500"
                  />
                  <span className="ml-3 text-white">Other</span>
                </label>
                
                {formData.college === 'other' && (
                  <input
                    type="text"
                    name="otherCollege"
                    value={formData.otherCollege}
                    onChange={handleChange}
                    placeholder="Enter your college name"
                    className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors mt-2"
                  />
                )}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                className="w-full bg-[#222]/50 border border-[#333] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || alreadyRegistered}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] shadow-xl hover:shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Registering...' : alreadyRegistered ? 'Already Registered' : 'Register Now'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
