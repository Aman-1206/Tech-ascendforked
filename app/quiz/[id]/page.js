/**
 * @page MCQ Quiz
 * @route /quiz/[id]
 * @description Timed MCQ quiz page with per-question countdown, auto-advance, and results
 */
"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { use } from 'react';

const QuizPage = ({ params }) => {
  const { id } = use(params);
  const { user, isLoaded } = useUser();

  // Quiz data
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quiz state
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState([]); // { questionIndex, selectedOption, timeTaken }
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Results
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);

  // Timer ref
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/quiz/${id}`);
        const data = await response.json();
        if (response.ok) {
          setQuiz(data.quiz);
          if (data.alreadySubmitted) {
            setAlreadySubmitted(true);
          }
        } else if (data.notRegistered) {
          setNotRegistered(true);
          setError(data.error);
        } else if (data.quiz && data.quiz.endTime && new Date() > new Date(data.quiz.endTime)) {
          setError('The timing to attend quiz is closed');
        } else {
          setError(data.error || 'Failed to load quiz');
        }
      } catch (err) {
        setError('Failed to load quiz');
      }
      setLoading(false);
    };
    fetchQuiz();
  }, [id]);

  // Ref to track answers without closure issues
  const answersRef = useRef([]);

  // Move to next question
  const goToNext = useCallback((timedOut = false) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const timeTaken = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0;

    // Save answer
    const answer = {
      questionIndex: currentQuestion,
      selectedOption: selectedOption !== null ? selectedOption : -1,
      timeTaken,
    };

    const updatedAnswers = [...answersRef.current, answer];
    answersRef.current = updatedAnswers;
    setAnswers(updatedAnswers);

    // Check if this was the last question
    if (currentQuestion >= quiz.questions.length - 1) {
      // Submit quiz
      submitQuiz(updatedAnswers);
    } else {
      // Move to next question after brief delay
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsTransitioning(false);
      }, 300);
    }
  }, [currentQuestion, selectedOption, quiz, isTransitioning]);

  // Ref to always have latest goToNext for timer
  const goToNextRef = useRef(goToNext);
  goToNextRef.current = goToNext;

  // Start timer for current question
  useEffect(() => {
    if (!started || !quiz || submitted || isTransitioning) return;

    const question = quiz.questions[currentQuestion];
    if (!question) return;

    setTimeLeft(question.timeLimit);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          // Auto-advance using ref to avoid stale closure
          setTimeout(() => goToNextRef.current(true), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [started, currentQuestion, quiz, submitted, isTransitioning]);

  // Submit quiz
  const submitQuiz = async (finalAnswers) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/quiz/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      const data = await response.json();
      if (response.ok) {
        setResults({ success: true, feedbackLink: data.feedbackLink });
        setSubmitted(true);
      } else if (data.alreadySubmitted) {
        setResults({ success: true, alreadySubmitted: true, feedbackLink: quiz?.feedbackLink });
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit quiz');
      }
    } catch (err) {
      setError('Failed to submit quiz');
    }
    setSubmitting(false);
  };

  // Start quiz
  const handleStart = () => {
    setStarted(true);
    setCurrentQuestion(0);
    setAnswers([]);
    answersRef.current = [];
    setSelectedOption(null);
  };

  // Loading
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Sign In Required</h1>
          <p className="text-gray-400 mb-6">Please sign in to take this quiz. Your answers will be saved with your account.</p>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25">
              Sign In to Start
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Error
  if (error && !submitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Oops!</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/" className="text-orange-400 hover:text-orange-300">← Back to Home</Link>
        </div>
      </div>
    );
  }

  // Results screen — no score shown
  if (submitted && results) {
    const feedbackLink = results.feedbackLink || quiz?.feedbackLink;

    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#111]/80 backdrop-blur-sm rounded-3xl p-8 border border-[#333] text-center mb-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Quiz Submitted Successfully!</h1>
            <p className="text-gray-400">Your answers have been recorded. Thank you for participating!</p>
          </div>

          {/* Feedback Link & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {feedbackLink && (
              <a
                href={feedbackLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
              >
                📝 Give Feedback
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            <Link
              href="/"
              className="px-6 py-3 bg-[#222] text-white rounded-xl font-medium hover:bg-[#333] transition-colors border border-[#444]"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted — block retake
  if (alreadySubmitted && !submitted) {
    const feedbackLink = quiz?.feedbackLink;
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="bg-[#111]/80 backdrop-blur-sm rounded-3xl p-8 border border-[#333] text-center">
            <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Already Submitted</h1>
            <p className="text-gray-400 mb-6">You have already attempted this quiz. Each quiz can only be taken once.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {feedbackLink && (
                <a
                  href={feedbackLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
                >
                  📝 Give Feedback
                </a>
              )}
              <Link
                href="/"
                className="px-5 py-2.5 bg-[#222] text-white rounded-xl font-medium hover:bg-[#333] transition-colors border border-[#444]"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="bg-[#111]/80 backdrop-blur-sm rounded-3xl p-8 border border-[#333] text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/25">
              <span className="text-4xl">📝</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{quiz.title}</h1>
            <div className="flex items-center justify-center gap-4 text-gray-400 text-sm mb-6">
              <span>📋 {quiz.questions.length} Questions</span>
              <span>⏱️ Timed</span>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-6 text-left">
              <h3 className="text-white font-medium mb-2 text-sm">📌 Instructions:</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Each question has its own time limit</li>
                <li>• When time runs out, it auto-moves to the next question</li>
                <li>• Select your answer and click &quot;Next&quot; to continue</li>
                <li>• You cannot go back to previous questions</li>
                <li>• You can only attempt this quiz once</li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Quiz →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitting
  if (submitting) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Submitting your answers...</p>
        </div>
      </div>
    );
  }

  // Quiz question view
  const question = quiz.questions[currentQuestion];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestion) / totalQuestions) * 100;
  const timerPercentage = question ? (timeLeft / question.timeLimit) * 100 : 0;
  const isTimeCritical = timeLeft <= 5;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#111]/95 backdrop-blur-sm border-b border-[#333] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">
              Question <span className="text-white font-semibold">{currentQuestion + 1}</span> of {totalQuestions}
            </span>
            {/* Timer */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isTimeCritical
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'bg-[#222] text-gray-300'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono font-bold text-sm">{timeLeft}s</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Timer ring */}
          <div className="flex justify-center mb-8">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#333" strokeWidth="4" />
                <circle
                  cx="40" cy="40" r="35" fill="none"
                  stroke={isTimeCritical ? '#ef4444' : '#f97316'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(timerPercentage / 100) * 220} 220`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold font-mono ${isTimeCritical ? 'text-red-400' : 'text-white'}`}>
                  {timeLeft}
                </span>
              </div>
            </div>
          </div>

          {/* Question */}
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-8 leading-relaxed">
            {question.question}
          </h2>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => setSelectedOption(index)}
                disabled={isTransitioning}
                className={`relative p-4 rounded-xl text-left transition-all duration-200 border-2 group ${
                  selectedOption === index
                    ? 'bg-orange-500/20 border-orange-500 text-white shadow-lg shadow-orange-500/10'
                    : 'bg-[#111]/80 border-[#333] text-gray-300 hover:border-[#555] hover:bg-[#1a1a1a]'
                } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    selectedOption === index
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#333] text-gray-400 group-hover:bg-[#444]'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-sm sm:text-base leading-relaxed pt-1">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Next button */}
          <div className="flex justify-center">
            <button
              onClick={() => goToNext(false)}
              disabled={selectedOption === null || isTransitioning}
              className="px-8 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-orange-600 disabled:hover:to-amber-600 hover:scale-[1.02] active:scale-[0.98]"
            >
              {currentQuestion >= totalQuestions - 1 ? 'Submit Quiz' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
