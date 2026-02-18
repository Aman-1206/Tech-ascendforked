/**
 * @page Events List
 * @route /events
 * @description Browse all available events and register for them
 */
"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  // Fetch user registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!isLoaded || !isSignedIn || !user) return;

      try {
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return;

        const response = await fetch(`/api/registrations?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const data = await response.json();
          const registeredIds = new Set(data.registrations.map(reg => reg.eventId));
          setRegisteredEventIds(registeredIds);
        }
      } catch (error) {
        console.error('Error fetching registrations:', error);
      }
    };

    fetchRegistrations();
  }, [isLoaded, isSignedIn, user]);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isLoaded || !isSignedIn) return;
      try {
        const res = await fetch('/api/quiz?admin=true');
        if (res.ok) setIsAdmin(true);
      } catch (err) { /* not admin */ }
    };
    checkAdmin();
  }, [isLoaded, isSignedIn]);



  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Upcoming <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Events</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Register for exciting tech events, competitions, and workshops. Showcase your skills and learn from the best!
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(loading ? [...Array(6)] : events).map((event, index) => {
            if (loading) {
              return (
                <div key={index} className="bg-[#111]/50 rounded-2xl p-6 border border-[#333] h-[480px] flex flex-col animate-pulse">
                  <div className="w-full aspect-[16/9] bg-[#222] rounded-xl mb-4"></div>
                  <div className="w-24 h-6 bg-[#222] rounded-full mb-3"></div>
                  <div className="w-3/4 h-6 bg-[#222] rounded mb-2"></div>
                  <div className="w-full h-4 bg-[#222] rounded mb-4"></div>
                  <div className="w-1/2 h-4 bg-[#222] rounded mb-auto"></div>
                  <div className="w-full h-12 bg-[#222] rounded-xl mt-4"></div>
                </div>
              );
            }

            return (
              <div 
                key={event.id}
                className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#333] hover:border-orange-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-xl hover:shadow-orange-500/10 group flex flex-col h-full"
              >
                {/* Event Image/Icon */}
                <div className="w-full aspect-[16/9] bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300 overflow-hidden relative">
                  {event.imagePath || event.mobileImagePath ? (
                    <picture className="w-full h-full">
                      {/* Mobile Image Source */}
                      {event.mobileImagePath && (
                        <source media="(max-width: 640px)" srcSet={event.mobileImagePath} />
                      )}
                      {/* Desktop/Fallback Image */}
                      <img 
                        src={event.imagePath || event.mobileImagePath} 
                        alt={event.name} 
                        className="w-full h-full object-cover rounded-xl"
                        loading="lazy"
                      />
                    </picture>
                  ) : (
                    <span className="text-3xl">{event.image}</span>
                  )}
                </div>

                {/* Category Badge */}
                <span className="inline-block px-3 py-1 text-sm font-medium text-orange-400 bg-orange-500/10 rounded-full mb-3 min-h-[2rem]">
                  {event.category}
                </span>

                {/* Event Name */}
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors duration-300 min-h-[3.5rem] line-clamp-2">
                  {event.name}
                </h3>

                {/* Event Description */}
                <p className="text-gray-400 mb-4 text-sm leading-relaxed line-clamp-2 min-h-[2.5rem]">
                  {event.description}
                </p>

                {/* Event Date */}
                <div className="flex items-center text-gray-500 mb-4 min-h-[1.5rem]">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm">{event.date}</span>
                </div>

                {/* Register Button */}
                {/* Register Button Area - Fixed min-height to prevent CLS */}
                <div className="mt-auto min-h-[6rem] flex flex-col justify-end">
                  {(() => {
                    const isExpired = event.deadline && new Date(event.deadline) < new Date();
                    const isClosed = !event.registrationOpen || isExpired;

                    if (registeredEventIds.has(event.id)) {
                      return (
                        <div className="flex flex-col gap-2">
                          <span className="block w-full bg-green-500/10 border border-green-500/20 text-green-400 py-2 rounded-xl text-center text-sm font-medium h-10 flex items-center justify-center">
                            ✅ Already Registered
                          </span>
                          <Link 
                            href={`/events/${event.id}`}
                            className="block w-full bg-[#222] hover:bg-[#333] text-white py-2 rounded-xl font-medium transition-all duration-300 text-center text-sm flex items-center justify-center gap-2 h-10"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Event Details
                          </Link>
                        </div>
                      );
                    }

                    if (isClosed) {
                      return isAdmin ? (
                        <Link
                          href={`/events/${event.id}`}
                          className="block w-full bg-[#1a1a1a] border border-[#333] text-gray-400 h-12 rounded-xl font-medium hover:border-orange-500/30 hover:text-gray-300 transition-all text-center flex items-center justify-center"
                        >
                          {isExpired ? 'Registration Ended' : 'Registration Closed'} — View Details
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="block w-full bg-[#1a1a1a] border border-[#333] text-gray-500 h-12 rounded-xl font-medium cursor-not-allowed"
                        >
                          {isExpired ? 'Registration Ended' : 'Registration Closed'}
                        </button>
                      );
                    }

                    return (
                      <Link 
                        href={`/events/${event.id}`}
                        className="block w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white h-12 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-orange-500/25 text-center flex items-center justify-center"
                      >
                        Register Now
                      </Link>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link 
            href="/"
            className="inline-flex items-center text-orange-400 hover:text-orange-300 transition-colors duration-300 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
