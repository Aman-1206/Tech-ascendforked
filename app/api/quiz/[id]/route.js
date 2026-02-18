/**
 * @api Quiz by ID
 * @route /api/quiz/[id]
 * @description Fetch a single quiz for users (excludes correct answers, checks registration & time window)
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import QuizResponse from '@/models/QuizResponse';
import Registration from '@/models/Registration';
import { checkAuth, checkAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch quiz by ID (for users taking the quiz)
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = await params;

    const quiz = await Quiz.findById(id).lean();

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Check if user is admin — admins bypass all restrictions
    const { isAdmin } = await checkAdminAuth();

    if (!isAdmin) {
      if (!quiz.isActive) {
        return NextResponse.json({ error: 'This quiz is no longer available' }, { status: 403 });
      }

      // Check time window
      const now = new Date();
      if (quiz.startTime && now < new Date(quiz.startTime)) {
        return NextResponse.json({ 
          error: 'This quiz is not available yet',
          startTime: quiz.startTime,
          notStarted: true,
        }, { status: 403 });
      }
      if (quiz.endTime && now > new Date(quiz.endTime)) {
        return NextResponse.json({ 
          error: 'This quiz has ended',
          ended: true,
        }, { status: 403 });
      }
    }

    // Get user email for registration + duplicate checks
    let userEmail = null;
    const authCheck = await checkAuth();
    if (authCheck.isAuthenticated) {
      userEmail = authCheck.user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    }

    // Check registration if quiz is linked to an event (skip for admins)
    if (quiz.eventId && !isAdmin) {
      if (!authCheck.isAuthenticated) {
        return NextResponse.json({ error: 'Please sign in to access this quiz' }, { status: 401 });
      }

      const registration = await Registration.findOne({ 
        eventId: quiz.eventId, 
        email: userEmail 
      });

      if (!registration) {
        return NextResponse.json({ 
          error: 'You must be registered for this event to take the quiz',
          notRegistered: true,
        }, { status: 403 });
      }
    }

    // Check if user already submitted this quiz
    let alreadySubmitted = false;
    if (userEmail) {
      const existing = await QuizResponse.findOne({ quizId: id, userEmail });
      if (existing) alreadySubmitted = true;
    }

    // Strip correct answers before sending to client
    const safeQuiz = {
      _id: quiz._id,
      title: quiz.title,
      feedbackLink: quiz.feedbackLink,
      eventId: quiz.eventId,
      questions: quiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
        timeLimit: q.timeLimit,
      })),
    };

    return NextResponse.json({ quiz: safeQuiz, alreadySubmitted });
  } catch (error) {
    console.error('GET quiz by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }
}
