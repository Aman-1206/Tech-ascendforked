/**
 * @page Event Details
 * @route /events/[id]
 * @description Single event page with full details and registration button
 */
"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useUser, SignInButton } from '@clerk/nextjs';

const EventDetailPage = () => {
  const params = useParams();
  const eventId = parseInt(params.id);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();

  // Submission state
  const [uploading, setUploading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionInfo, setSubmissionInfo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Quiz state
  const [eventQuizzes, setEventQuizzes] = useState([]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events?id=${eventId}`);
        const data = await response.json();
        setEvent(data.event || null);
      } catch (error) {
        console.error('Error fetching event:', error);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [eventId]);

  // Check if already registered
  useEffect(() => {
    const checkRegistration = async () => {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return;

        const response = await fetch(`/api/registrations?email=${encodeURIComponent(email)}&eventId=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.isRegistered) {
            setIsRegistered(true);
          }
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      }
    };

    checkRegistration();
  }, [eventId, isLoaded, isSignedIn, user]);

  // Check if user has already submitted
  useEffect(() => {
    const checkSubmission = async () => {
      if (!isLoaded || !isSignedIn || !user) return;
      const email = user.primaryEmailAddress?.emailAddress;
      if (!email) return;

      try {
        const response = await fetch(`/api/submissions?eventId=${eventId}&userEmail=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasSubmission) {
            setHasSubmitted(true);
            setSubmissionInfo(data.submission);
          }
        }
      } catch (error) {
        console.error('Error checking submission:', error);
      }
    };
    checkSubmission();
  }, [eventId, isLoaded, isSignedIn, user]);

  // Fetch quizzes linked to this event
  useEffect(() => {
    const fetchEventQuizzes = async () => {
      try {
        const response = await fetch(`/api/quiz?eventId=${eventId}`);
        if (response.ok) {
          const data = await response.json();
          setEventQuizzes(data.quizzes || []);
        }
      } catch (error) {
        console.error('Error fetching event quizzes:', error);
      }
    };
    if (eventId) fetchEventQuizzes();
  }, [eventId]);

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('eventId', eventId.toString());
      formData.append('eventName', event?.name || '');
      formData.append('userEmail', user.primaryEmailAddress?.emailAddress || '');
      formData.append('userName', user.fullName || user.firstName || '');

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setHasSubmitted(true);
        setSubmissionInfo(data.submission);
        setSelectedFile(null);
      } else {
        setUploadError(data.error || 'Failed to upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file');
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16 flex items-center justify-center">
        <div className="text-white text-xl">Loading event...</div>
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/events"
          className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors duration-300 mb-8"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Events
        </Link>

        {/* Event Header */}
        <div className="bg-[#111]/50 backdrop-blur-sm rounded-3xl border border-[#333] overflow-hidden mb-8">
          {/* Hero Section */}
          <div className="relative min-h-[400px] overflow-hidden">
            {/* Background Image using <picture> for Art Direction */}
            {(event.imagePath || event.mobileImagePath) && (
              <div className="absolute inset-0">
                <picture>
                  {event.mobileImagePath && (
                    <source media="(max-width: 640px)" srcSet={event.mobileImagePath} />
                  )}
                  <img
                    src={event.imagePath || event.mobileImagePath}
                    alt={event.name}
                    className="w-full h-full object-cover object-center"
                  />
                </picture>
                {/* Overlay for better text readability */}
                <div className="absolute inset-0 bg-black/50"></div>
              </div>
            )}

            <div className="relative p-8 sm:p-12 text-center flex flex-col justify-center items-center h-full min-h-[400px] z-10">
              {/* Overlay/Gradient Background */}
              {/* <div className={`absolute inset-0 ${
              event.imagePath 
                ? 'bg-gradient-to-t from-black via-black/80 to-black/40' 
                : 'bg-gradient-to-r from-orange-600/30 to-amber-600/30'
            }`}></div> */}

              {/* Content Container */}
              {/* <div className="relative z-10 w-full">
              {!event.imagePath && (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500/30 to-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 overflow-hidden">
                    <span className="text-6xl">{event.image}</span>
                </div>
              )}
              
              <span className="inline-block px-4 py-1 text-sm font-medium text-orange-200 bg-orange-900/50 backdrop-blur-sm border border-orange-500/30 rounded-full mb-4">
                {event.category}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg">
                {event.name}
              </h1>
              <p className="text-xl sm:text-2xl text-gray-200 italic max-w-3xl mx-auto drop-shadow-md">{event.tagline}</p>
            </div> */}
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-[#333]">
            <div className="text-center p-4 bg-[#222]/50 rounded-xl">
              <div className="text-orange-400 mb-1">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-xs mb-1">Date</p>
              <p className="text-white font-medium text-sm">{event.date}</p>
            </div>
            <div className="text-center p-4 bg-[#222]/50 rounded-xl">
              <div className="text-orange-400 mb-1">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-400 text-xs mb-1">Duration</p>
              <p className="text-white font-medium text-sm">{event.duration}</p>
            </div>
            <div className="text-center p-4 bg-[#222]/50 rounded-xl">
              <div className="text-orange-400 mb-1">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-xs mb-1">Mode</p>
              <p className="text-white font-medium text-sm">{event.mode}</p>
            </div>
            <div className="text-center p-4 bg-[#222]/50 rounded-xl">
              <div className="text-orange-400 mb-1">
                <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-400 text-xs mb-1">Team Size</p>
              <p className="text-white font-medium text-sm">{event.teamSize}</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* About */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">📋</span>
                About the Event
              </h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-6">{event.description}</p>

              {event.communityLink && (
                <a
                  href={event.communityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-xl font-medium transition-all duration-300 group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.1180.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Join Community
                </a>
              )}
            </div>

            {/* Quiz Section — visible to registered users */}
            {eventQuizzes.length > 0 && isRegistered && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">📝</span>
                  Event Quiz
                </h2>
                <div className="space-y-3">
                  {eventQuizzes.map((quiz) => {
                    const now = new Date();
                    const hasStarted = !quiz.startTime || now >= new Date(quiz.startTime);
                    const hasEnded = quiz.endTime && now > new Date(quiz.endTime);

                    return (
                      <div key={quiz._id} className="bg-[#222]/50 rounded-xl p-5 border border-purple-500/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h3 className="text-white font-semibold mb-1">{quiz.title}</h3>
                            <p className="text-gray-400 text-sm">
                              {quiz.questions?.length || 0} question{(quiz.questions?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                          {hasEnded ? (
                            <span className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-medium text-sm">
                              The timing to attend quiz is closed
                            </span>
                          ) : !hasStarted ? (
                            <div className="text-right">
                              <span className="px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl font-medium text-sm inline-block">
                                ⏳ Starts: {new Date(quiz.startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ) : (
                            <a
                              href={`/quiz/${quiz._id}`}
                              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 text-center"
                            >
                              🚀 Take Quiz
                            </a>
                          )}
                        </div>
                        {quiz.endTime && hasStarted && !hasEnded && (
                          <p className="text-gray-500 text-xs mt-2">
                            Ends: {new Date(quiz.endTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {/* Time & Location */}
              <div className="bg-[#222]/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">📍 Venue & Timing</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time</span>
                    <span className="text-white">{event.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Location</span>
                    <span className="text-white">{event.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Deadline</span>
                    <span className="text-red-400">{event.registrationDeadline}</span>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-[#222]/50 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-4">📝 Requirements</h3>
                <ul className="space-y-2">
                  {event.requirements && event.requirements.map((req, index) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <span className="text-orange-400 mr-2">✓</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Prizes */}
            {event.prizes && event.prizes.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">🏆</span>
                  Prizes
                </h2>
                <div className="flex flex-wrap gap-3">
                  {event.prizes.map((prize, index) => (
                    <span key={index} className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-300 rounded-full text-sm font-medium">
                      {prize}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            {event.highlights && event.highlights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center mr-3">✨</span>
                  Highlights
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {event.highlights.map((highlight, index) => (
                    <div key={index} className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
                      <span className="text-orange-200 text-sm">{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Statement & Submission Section (shown when registration is closed) */}
            {(() => {
              const isRegistrationClosed = !event.registrationOpen || (event.deadline && new Date(event.deadline) < new Date());
              const hasSubmission = event.submissionType && event.submissionType !== 'none';
              const hasProblemStatement = event.problemStatement && event.problemStatement.trim();

              if (!isRegistrationClosed || (!hasSubmission && !hasProblemStatement)) return null;

              return (
                <div className="mb-8 bg-gradient-to-br from-blue-500/10 to-orange-500/10 rounded-2xl border border-blue-500/30 p-6">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">📋</span>
                    Problem Statement / Task
                  </h2>

                  {/* Problem Statement */}
                  {hasProblemStatement && (
                    <div className="bg-[#111]/50 rounded-xl p-4 mb-4 whitespace-pre-wrap text-gray-300 leading-relaxed">
                      {event.problemStatement}
                    </div>
                  )}

                  {/* Submission Options */}
                  {hasSubmission && (() => {
                    const isSubmissionClosed = event.submissionDeadline && new Date(event.submissionDeadline) < new Date();

                    if (isSubmissionClosed) {
                      return (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                          <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-red-400 font-medium">Submission Closed</p>
                          <p className="text-gray-400 text-sm mt-1">
                            The deadline was {new Date(event.submissionDeadline).toLocaleString()}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Submit Your Work
                          {event.submissionDeadline && (
                            <span className="text-sm font-normal text-gray-400">
                              (Deadline: {new Date(event.submissionDeadline).toLocaleString()})
                            </span>
                          )}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* File Upload Option */}
                          {(event.submissionType === 'file' || event.submissionType === 'both') && (
                            <div className="bg-[#222]/50 rounded-xl p-4 border border-orange-500/20">
                              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Upload File
                                <span className="text-gray-500 text-xs font-normal">(Max {event.maxFileSize || 10}MB)</span>
                              </h4>

                              {hasSubmitted ? (
                                <div className="text-center">
                                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <p className="text-green-400 font-medium text-sm">Submitted!</p>
                                  {submissionInfo && (
                                    <>
                                      <p className="text-gray-400 text-xs mt-1 truncate">{submissionInfo.fileName}</p>
                                      <a
                                        href={submissionInfo.filePath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs mt-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View File
                                      </a>
                                    </>
                                  )}
                                </div>
                              ) : !isSignedIn ? (
                                <p className="text-gray-400 text-sm">Please sign in to upload</p>
                              ) : (
                                <>
                                  <input
                                    type="file"
                                    id="submission-file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        // Enforce 4MB hard limit for MongoDB storage
                                        const DB_LIMIT_MB = 4;
                                        const eventLimit = event.maxFileSize || 10;
                                        const maxFileSizeMB = Math.min(eventLimit, DB_LIMIT_MB);

                                        const maxSize = maxFileSizeMB * 1024 * 1024;
                                        if (file.size > maxSize) {
                                          setUploadError(`File too large. Max size is ${maxFileSizeMB}MB`);
                                          setSelectedFile(null);
                                          e.target.value = ''; // Reset input
                                        } else {
                                          setUploadError('');
                                          setSelectedFile(file);
                                        }
                                      }
                                    }}
                                  />
                                  {selectedFile ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <p className="text-white text-sm truncate flex-1">{selectedFile.name}</p>
                                        <button
                                          onClick={() => {
                                            setSelectedFile(null);
                                            setUploadError('');
                                            if (fileInputRef.current) {
                                              fileInputRef.current.value = '';
                                            }
                                          }}
                                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                          title="Remove file"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                      <p className="text-gray-500 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                      <button
                                        onClick={handleFileUpload}
                                        disabled={uploading}
                                        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        {uploading ? (
                                          <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Uploading...</>
                                        ) : (
                                          <>Upload Now</>
                                        )}
                                      </button>
                                    </div>
                                  ) : (
                                    <label
                                      htmlFor="submission-file"
                                      className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                      </svg>
                                      Choose File
                                    </label>
                                  )}
                                  {uploadError && (
                                    <p className="text-red-400 text-xs mt-2">{uploadError}</p>
                                  )}
                                </>
                              )}
                            </div>
                          )}

                          {/* Google Drive Option */}
                          {(event.submissionType === 'drive' || event.submissionType === 'both') && event.driveLink && (
                            <div className="bg-[#222]/50 rounded-xl p-4 border border-green-500/20">
                              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M4.433 22l3.775-6.5H22l-3.775 6.5H4.433zM14.6 8.5L7.825 22H.25l6.775-13.5H14.6zm-.85 0L6.975 22l-6.75-13.5H6.925L13.7 1.5l6.775 13.5H13.75z" />
                                </svg>
                                Submit Here
                              </h4>
                              <p className="text-gray-400 text-sm mb-3">Submit your submission</p>
                              <a
                                href={event.driveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Submission Link
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Register Button */}
            <div className="text-center pt-4">
              {(() => {
                const isExpired = event.deadline && new Date(event.deadline) < new Date();
                const isClosed = !event.registrationOpen || isExpired;

                if (isRegistered) {
                  return (
                    <div className="text-center">
                      <div className="inline-block bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-4">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-green-400 mb-2">You are Registered!</h3>
                        <p className="text-gray-300">
                          You have successfully registered for {event.name}.<br />
                          See you there!
                        </p>
                      </div>
                    </div>
                  );
                }

                if (isClosed) {
                  return (
                    <button
                      disabled
                      className="inline-block bg-[#1a1a1a] border border-[#333] text-gray-400 px-10 py-4 rounded-full font-semibold text-lg cursor-not-allowed"
                    >
                      {isExpired ? 'Registration Ended' : 'Registration Closed'}
                    </button>
                  );
                }

                // User not signed in - show sign-in button
                if (!isSignedIn) {
                  return (
                    <SignInButton mode="modal" redirectUrl={`/events/${eventId}/register`}>
                      <button className="inline-block bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-orange-500/30 cursor-pointer">
                        Sign In to Register
                      </button>
                    </SignInButton>
                  );
                }

                // User is signed in - show registration link
                return (
                  <Link
                    href={`/events/${eventId}/register`}
                    className="inline-block bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white px-10 py-4 rounded-full font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-orange-500/30"
                  >
                    Register for {event.name}
                  </Link>
                );
              })()}

              <p className="text-gray-500 text-sm mt-4">
                Registration closes on {event.registrationDeadline}
                {event.deadline && (
                  <span className="block text-xs mt-1 text-gray-600">
                    (Automated closing at: {new Date(event.deadline).toLocaleString()})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailPage;
