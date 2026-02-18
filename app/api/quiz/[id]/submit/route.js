/**
 * @api Quiz Submit
 * @route /api/quiz/[id]/submit
 * @description Submit quiz answers, calculate score server-side, hide score from user
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import QuizResponse from '@/models/QuizResponse';
import Registration from '@/models/Registration';
import { checkAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Submit quiz answers
export async function POST(request, { params }) {
  try {
    const authCheck = await checkAuth();
    if (!authCheck.isAuthenticated) return authCheck.error;

    const user = authCheck.user;
    const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail;

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
    }

    // Get quiz with correct answers (server-side only)
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Time window check
    const now = new Date();
    if (quiz.startTime && now < new Date(quiz.startTime)) {
      return NextResponse.json({ error: 'This quiz is not available yet' }, { status: 403 });
    }
    if (quiz.endTime && now > new Date(quiz.endTime)) {
      return NextResponse.json({ error: 'The timing to attend quiz is closed' }, { status: 403 });
    }

    // Registration check for event-linked quizzes
    if (quiz.eventId) {
      const registration = await Registration.findOne({ 
        eventId: quiz.eventId, 
        email: userEmail 
      });
      if (!registration) {
        return NextResponse.json({ 
          error: 'You must be registered for this event to submit the quiz',
          notRegistered: true,
        }, { status: 403 });
      }
    }

    // Check for duplicate submission
    const existing = await QuizResponse.findOne({ quizId: id, userEmail });
    if (existing) {
      return NextResponse.json({ 
        error: 'You have already submitted this quiz',
        alreadySubmitted: true,
      }, { status: 409 });
    }

    // Calculate score (server-side only — not shown to user)
    let score = 0;
    let totalTimeTaken = 0;
    
    quiz.questions.forEach((q, index) => {
      const userAnswer = answers.find(a => a.questionIndex === index);
      const selectedOption = userAnswer ? userAnswer.selectedOption : -1;
      if (selectedOption === q.correctAnswer) score++;
      
      // Sum explicit time taken
      if (userAnswer && userAnswer.timeTaken) {
        totalTimeTaken += userAnswer.timeTaken;
      }
    });

    // Save response
    await QuizResponse.create({
      quizId: id,
      userName,
      userEmail,
      answers: answers.map(a => ({
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        timeTaken: a.timeTaken || 0,
      })),
      score,
      totalQuestions: quiz.questions.length,
      totalTimeTaken,
    });

    // Return only success + feedback link (NO score or results)
    return NextResponse.json({
      success: true,
      feedbackLink: quiz.feedbackLink,
    });
  } catch (error) {
    console.error('Quiz submit error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ 
        error: 'You have already submitted this quiz',
        alreadySubmitted: true 
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 });
  }
}
