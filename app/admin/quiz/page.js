/**
 * @page Admin Quiz Management
 * @route /admin/quiz
 * @description Create, manage, and view MCQ quizzes with per-question time limits
 */
"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';

const AdminQuizPage = () => {
  const { user, isLoaded } = useUser();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null); // quiz ID being edited
  const [viewResponses, setViewResponses] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Create/Edit quiz form state
  const [quizTitle, setQuizTitle] = useState('');
  const [feedbackLink, setFeedbackLink] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, imagePath: '' }
  ]);
  const [creating, setCreating] = useState(false);
  const [events, setEvents] = useState([]);
  const [deletingResponseId, setDeletingResponseId] = useState(null);
  const [uploadingImages, setUploadingImages] = useState({}); // { questionIndex: true/false }
  const [imagePreviews, setImagePreviews] = useState({}); // { questionIndex: dataUrl }

  // Fetch quizzes
  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quiz?admin=true');
      if (response.status === 401 || response.status === 403) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
    setLoading(false);
  };

  // Fetch responses for a quiz
  const fetchResponses = async (quizId) => {
    setLoadingResponses(true);
    try {
      const response = await fetch(`/api/quiz/responses?quizId=${quizId}`);
      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses || []);
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
    setLoadingResponses(false);
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchQuizzes();
      fetchEvents();
    }
  }, [isLoaded, user]);

  // Fetch events for dropdown
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  // Add a new question
  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, imagePath: '' }]);
  };

  // Remove a question
  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Update question field
  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // Update option
  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  // Reset form
  const resetForm = () => {
    setQuizTitle('');
    setFeedbackLink('');
    setSelectedEventId('');
    setStartTime('');
    setEndTime('');
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, timeLimit: 30, imagePath: '' }]);
    setEditingQuiz(null);
    setShowCreateForm(false);
    setImagePreviews({});
    setUploadingImages({});
  };

  // Helper to format date for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const pad = (num) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Start editing a quiz
  const startEditing = (quiz) => {
    setEditingQuiz(quiz._id);
    setQuizTitle(quiz.title);
    setFeedbackLink(quiz.feedbackLink || '');
    setSelectedEventId(quiz.eventId ? String(quiz.eventId) : '');
    setStartTime(formatDateTimeLocal(quiz.startTime));
    setEndTime(formatDateTimeLocal(quiz.endTime));
    const questionsWithImages = quiz.questions.map(q => ({
      question: q.question,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      timeLimit: q.timeLimit,
      imagePath: q.imagePath || '',
    }));
    setQuestions(questionsWithImages);
    // Set image previews for existing images
    const previews = {};
    questionsWithImages.forEach((q, idx) => {
      if (q.imagePath) {
        previews[idx] = q.imagePath;
      }
    });
    setImagePreviews(previews);
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Create or update quiz
  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    setCreating(true);

    const payload = {
      title: quizTitle,
      questions: questions.map(q => {
        const timeLimit = parseInt(q.timeLimit, 10);
        const correctAnswer = parseInt(q.correctAnswer, 10);
        return {
          ...q,
          timeLimit: Number.isNaN(timeLimit) || timeLimit < 5 ? 30 : Math.min(300, timeLimit),
          correctAnswer: Number.isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3 ? 0 : correctAnswer,
        };
      }),
      feedbackLink,
      eventId: selectedEventId ? parseInt(selectedEventId, 10) : null,
      startTime: startTime || null,
      endTime: endTime || null,
    };

    try {
      const isEditing = !!editingQuiz;
      const response = await fetch('/api/quiz', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { ...payload, id: editingQuiz } : payload),
      });

      const data = await response.json();
      if (response.ok) {
        resetForm();
        fetchQuizzes();
      } else {
        alert(data.error || `Failed to ${isEditing ? 'update' : 'create'} quiz`);
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Error saving quiz');
    }
    setCreating(false);
  };

  // Toggle quiz active
  const toggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch('/api/quiz', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      if (response.ok) {
        fetchQuizzes();
      }
    } catch (error) {
      console.error('Error toggling quiz:', error);
    }
  };

  // Delete quiz
  const deleteQuiz = async (id) => {
    if (!confirm('Are you sure you want to delete this quiz? All responses will also be deleted.')) return;
    try {
      const response = await fetch(`/api/quiz?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        fetchQuizzes();
        if (viewResponses === id) {
          setViewResponses(null);
          setResponses([]);
        }
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
    }
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

  // Handle image upload for a question
  const handleQuestionImageUpload = async (e, questionIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviews(prev => ({ ...prev, [questionIndex]: e.target.result }));
    };
    reader.readAsDataURL(file);

    setUploadingImages(prev => ({ ...prev, [questionIndex]: true }));

    try {
      // Compress image before upload
      const compressedDataUrl = await compressImage(file);

      // Convert base64 back to blob for upload
      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();

      // Validating file size (1MB limit)
      if (blob.size > 1024 * 1024) {
        alert('Image is too large. Please use a smaller image (under 1MB after compression).');
        setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
        return;
      }

      const compressedFile = new File([blob], file.name, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', compressedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      const data = await response.json();
      if (data.success) {
        updateQuestion(questionIndex, 'imagePath', data.imagePath);
        setImagePreviews(prev => ({ ...prev, [questionIndex]: data.imagePath }));
      } else {
        const msg = response.status === 403 && data.hint
          ? `${data.error}\n\n${data.hint}`
          : (data.error || 'Unknown error');
        alert('Image upload failed: ' + msg);
        setImagePreviews(prev => {
          const newPreviews = { ...prev };
          delete newPreviews[questionIndex];
          return newPreviews;
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image');
      setImagePreviews(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[questionIndex];
        return newPreviews;
      });
    }
    setUploadingImages(prev => ({ ...prev, [questionIndex]: false }));
  };

  // Remove image from a question
  const removeQuestionImage = (questionIndex) => {
    updateQuestion(questionIndex, 'imagePath', '');
    setImagePreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[questionIndex];
      return newPreviews;
    });
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Quiz Management</h1>
          <p className="text-gray-400 text-sm">Create and manage MCQ quizzes with timed questions</p>
        </div>
        <button
          onClick={() => {
            if (showCreateForm) {
              resetForm();
            } else {
              setEditingQuiz(null);
              setShowCreateForm(true);
            }
          }}
          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25"
        >
          {showCreateForm ? '✕ Cancel' : '+ Create Quiz'}
        </button>
      </div>

      {/* Create Quiz Form */}
      {showCreateForm && (
        <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#333] mb-8">
          <h2 className="text-lg font-bold text-white mb-6">{editingQuiz ? '✏️ Edit Quiz' : 'Create New Quiz'}</h2>
          <form onSubmit={handleSubmitQuiz} className="space-y-6">
            {/* Quiz Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Quiz Title</label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Tech Ascend Quiz Round 1"
                className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
                required
              />
            </div>

            {/* Feedback Link */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Feedback Form Link (shown after submission)</label>
              <input
                type="url"
                value={feedbackLink}
                onChange={(e) => setFeedbackLink(e.target.value)}
                placeholder="https://forms.google.com/..."
                className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {/* Event Integration */}
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#333] space-y-4">
              <h3 className="text-sm font-semibold text-orange-400">🔗 Event Integration (Optional)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Link to Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="">No event (standalone quiz)</option>
                  {events.map((ev) => (
                    <option key={ev.id || ev._id} value={ev.id}>
                      {ev.name} {ev.date ? `(${ev.date})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-1">Only users registered for this event can take the quiz</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-gray-500 text-xs mt-1">Quiz becomes available at this time</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white focus:outline-none focus:border-orange-500 transition-colors"
                  />
                  <p className="text-gray-500 text-xs mt-1">Quiz is locked after this time</p>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-300">Questions</label>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-3 py-1 text-sm bg-green-600/20 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-600/30 transition-colors"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333] relative">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-medium">Question {qIndex + 1}</h3>
                      <div className="flex items-center gap-3">
                        {/* Time Limit */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">⏱️</span>
                          <input
                            type="number"
                            value={q.timeLimit}
                            onChange={(e) => updateQuestion(qIndex, 'timeLimit', e.target.value)}
                            min="5"
                            max="300"
                            className="w-16 px-2 py-1 bg-[#222] border border-[#444] rounded-lg text-white text-sm text-center focus:outline-none focus:border-orange-500"
                          />
                          <span className="text-gray-400 text-xs">sec</span>
                        </div>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Text */}
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      placeholder="Enter your question..."
                      className="w-full px-4 py-3 bg-[#222] border border-[#444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors mb-4"
                      required
                    />

                    {/* Image Upload */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">Question Image (Optional)</label>
                      {imagePreviews[qIndex] ? (
                        <div className="relative">
                          <img
                            src={imagePreviews[qIndex]}
                            alt="Question preview"
                            className="max-w-full max-h-64 rounded-lg border border-[#444] mb-2"
                          />
                          <button
                            type="button"
                            onClick={() => removeQuestionImage(qIndex)}
                            className="absolute top-2 right-2 px-2 py-1 bg-red-600/80 text-white rounded-lg text-xs hover:bg-red-600 transition-colors"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-[#444] rounded-lg p-4 text-center hover:border-[#555] transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleQuestionImageUpload(e, qIndex)}
                            disabled={uploadingImages[qIndex]}
                            className="hidden"
                            id={`image-upload-${qIndex}`}
                          />
                          <label
                            htmlFor={`image-upload-${qIndex}`}
                            className={`cursor-pointer flex flex-col items-center gap-2 ${
                              uploadingImages[qIndex] ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {uploadingImages[qIndex] ? (
                              <>
                                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-400">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <span className="text-2xl">📷</span>
                                <span className="text-sm text-gray-400">Click to upload image</span>
                                <span className="text-xs text-gray-500">PNG, JPG, GIF, WebP (max 1MB)</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                              q.correctAnswer === oIndex
                                ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                                : 'bg-[#333] text-gray-400 hover:bg-[#444]'
                            }`}
                            title={q.correctAnswer === oIndex ? 'Correct answer' : 'Click to mark as correct'}
                          >
                            {String.fromCharCode(65 + oIndex)}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                            className="flex-1 px-3 py-2 bg-[#222] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-semibold hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {editingQuiz ? 'Saving...' : 'Creating...'}
                </span>
              ) : (
                editingQuiz
                  ? `Save Changes (${questions.length} question${questions.length > 1 ? 's' : ''})`
                  : `Create Quiz (${questions.length} question${questions.length > 1 ? 's' : ''})`
              )}
            </button>
          </form>
        </div>
      )}

      {/* Quizzes List */}
      <div className="bg-[#111]/50 backdrop-blur-sm rounded-2xl p-6 border border-[#333] mb-8">
        <h2 className="text-lg font-bold text-white mb-4">All Quizzes</h2>
        {quizzes.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📝</span>
            <p className="text-gray-400">No quizzes created yet</p>
            <p className="text-gray-500 text-sm mt-1">Click &quot;Create Quiz&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div key={quiz._id} className="bg-[#1a1a1a] rounded-xl p-5 border border-[#333]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-semibold">{quiz.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        quiz.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                      <span>📋 {quiz.questions.length} question{quiz.questions.length > 1 ? 's' : ''}</span>
                      <span>👥 {quiz.responseCount || 0} response{(quiz.responseCount || 0) !== 1 ? 's' : ''}</span>
                      <span>📅 {new Date(quiz.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {quiz.eventId && (
                        <span className="text-orange-400">🔗 Event #{quiz.eventId}{events.find(e => e.id === quiz.eventId) ? ` — ${events.find(e => e.id === quiz.eventId).name}` : ''}</span>
                      )}
                    </div>
                    {(quiz.startTime || quiz.endTime) && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {quiz.startTime && <span>🟢 Starts: {new Date(quiz.startTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        {quiz.endTime && <span>🔴 Ends: {new Date(quiz.endTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                      </div>
                    )}
                    {/* Quiz Link */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Quiz Link:</span>
                      <code className="text-xs text-orange-400 bg-[#222] px-2 py-1 rounded">
                        /quiz/{quiz._id}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/quiz/${quiz._id}`);
                          alert('Quiz link copied!');
                        }}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                        title="Copy link"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => startEditing(quiz)}
                      className="px-3 py-2 bg-orange-600/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm hover:bg-orange-600/20 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        if (viewResponses === quiz._id) {
                          setViewResponses(null);
                          setResponses([]);
                        } else {
                          setViewResponses(quiz._id);
                          fetchResponses(quiz._id);
                        }
                      }}
                      className="px-3 py-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm hover:bg-blue-600/20 transition-colors"
                    >
                      {viewResponses === quiz._id ? 'Hide' : 'Responses'}
                    </button>
                    <button
                      onClick={() => toggleActive(quiz._id, quiz.isActive)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                        quiz.isActive
                          ? 'bg-amber-600/10 text-amber-400 border-amber-500/20 hover:bg-amber-600/20'
                          : 'bg-green-600/10 text-green-400 border-green-500/20 hover:bg-green-600/20'
                      }`}
                    >
                      {quiz.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => deleteQuiz(quiz._id)}
                      className="px-3 py-2 bg-red-600/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-600/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Responses Panel */}
                {viewResponses === quiz._id && (
                  <div className="mt-4 pt-4 border-t border-[#333]">
                    <h4 className="text-white font-medium mb-3">Quiz Responses</h4>
                    {loadingResponses ? (
                      <div className="text-center py-4">
                        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : responses.length === 0 ? (
                      <p className="text-gray-400 text-sm">No responses yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400 border-b border-[#333]">
                              <th className="pb-2 pr-4">Name</th>
                              <th className="pb-2 pr-4">Email</th>
                              <th className="pb-2 pr-4">Score</th>
                              <th className="pb-2 pr-4">Time</th>
                              <th className="pb-2 pr-4">Submitted</th>
                              <th className="pb-2">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {responses.map((r) => (
                              <tr key={r._id} className="border-b border-[#222]">
                                <td className="py-2 pr-4 text-white">{r.userName}</td>
                                <td className="py-2 pr-4 text-gray-400">{r.userEmail}</td>
                                <td className="py-2 pr-4">
                                  <span className={`font-semibold ${
                                    (r.score / r.totalQuestions) >= 0.7 ? 'text-green-400' :
                                    (r.score / r.totalQuestions) >= 0.4 ? 'text-amber-400' : 'text-red-400'
                                  }`}>
                                    {r.score}/{r.totalQuestions}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-gray-400 font-mono text-xs">
                                  {r.totalTimeTaken ? (
                                    `${Math.floor(r.totalTimeTaken / 60)}m ${r.totalTimeTaken % 60}s`
                                  ) : (
                                    <span title="Not recorded">-</span>
                                  )}
                                </td>
                                <td className="py-2 pr-4 text-gray-400">
                                  {new Date(r.submittedAt).toLocaleString('en-IN', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>
                                <td className="py-2">
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete response from ${r.userName}?`)) return;
                                      setDeletingResponseId(r._id);
                                      try {
                                        const res = await fetch(`/api/quiz/responses?id=${r._id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                          setResponses(prev => prev.filter(resp => resp._id !== r._id));
                                          fetchQuizzes(); // refresh response count
                                        } else {
                                          alert('Failed to delete response');
                                        }
                                      } catch (err) {
                                        alert('Error deleting response');
                                      }
                                      setDeletingResponseId(null);
                                    }}
                                    disabled={deletingResponseId === r._id}
                                    className="px-2 py-1 bg-red-600/10 text-red-400 border border-red-500/20 rounded-lg text-xs hover:bg-red-600/20 transition-colors disabled:opacity-50"
                                  >
                                    {deletingResponseId === r._id ? '...' : '🗑️ Delete'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminQuizPage;
