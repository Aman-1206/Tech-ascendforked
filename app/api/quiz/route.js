/**
 * @api Quiz API
 * @route /api/quiz
 * @description CRUD operations for quizzes (admin-only for create/delete)
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quiz from '@/models/Quiz';
import QuizResponse from '@/models/QuizResponse';
import { checkAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all quizzes
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const adminView = searchParams.get('admin') === 'true';

    if (adminView) {
      const { isAdmin, error } = await checkAdminAuth();
      if (!isAdmin) return error;

      const eventIdFilter = searchParams.get('eventId');
      const adminQuery = {};
      if (eventIdFilter) adminQuery.eventId = parseInt(eventIdFilter);

      const quizzes = await Quiz.find(adminQuery).sort({ createdAt: -1 }).lean();
      
      // Get response counts for each quiz
      const quizzesWithStats = await Promise.all(
        quizzes.map(async (quiz) => {
          const responseCount = await QuizResponse.countDocuments({ quizId: quiz._id });
          return { ...quiz, responseCount };
        })
      );

      return NextResponse.json({ quizzes: quizzesWithStats });
    }

    // Public view - only active quizzes, no correct answers
    const eventId = searchParams.get('eventId');
    const query = { isActive: true };
    if (eventId) query.eventId = parseInt(eventId);

    const quizzes = await Quiz.find(query)
      .select('title questions.question questions.options questions.timeLimit questions.imagePath feedbackLink eventId startTime endTime')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('GET quizzes error:', error);
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}

// POST - Create a new quiz (admin only)
export async function POST(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const body = await request.json();
    const { title, questions, feedbackLink, eventId, startTime, endTime } = body;

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Title and at least one question are required' }, { status: 400 });
    }

    // Sanitize and validate each question
    const sanitizedQuestions = questions.map((q, i) => {
      const timeLimit = Number(q.timeLimit);
      const correctAnswer = Number(q.correctAnswer);
      if (!q.question || !q.options || q.options.length !== 4) {
        throw new Error(`Question ${i + 1}: Must have text and exactly 4 options`);
      }
      if (Number.isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
        throw new Error(`Question ${i + 1}: Must have a valid correct answer (0-3)`);
      }
      if (Number.isNaN(timeLimit) || timeLimit < 5 || timeLimit > 300) {
        throw new Error(`Question ${i + 1}: Time limit must be between 5 and 300 seconds`);
      }
      return {
        question: String(q.question).trim(),
        options: q.options.map((o) => String(o).trim()),
        correctAnswer: Math.floor(correctAnswer),
        timeLimit: Math.floor(timeLimit),
        imagePath: q.imagePath ? String(q.imagePath) : '',
      };
    });

    const startDate = startTime && String(startTime).trim() ? new Date(startTime) : null;
    const endDate = endTime && String(endTime).trim() ? new Date(endTime) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid end time' }, { status: 400 });
    }

    const quiz = await Quiz.create({
      title: title.trim(),
      questions: sanitizedQuestions,
      feedbackLink: feedbackLink?.trim() || '',
      eventId: eventId != null && eventId !== '' ? parseInt(eventId, 10) : null,
      startTime: startDate,
      endTime: endDate,
    });

    return NextResponse.json({ success: true, quiz }, { status: 201 });
  } catch (error) {
    console.error('POST quiz error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create quiz';
    const isValidation =
      (error.message && error.message.startsWith('Question ')) ||
      error.name === 'ValidationError';
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}

// DELETE - Delete a quiz (admin only)
export async function DELETE(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

    const result = await Quiz.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Also delete all responses for this quiz
    await QuizResponse.deleteMany({ quizId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE quiz error:', error);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }
}

// PATCH - Toggle quiz active status (admin only)
export async function PATCH(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

    const quiz = await Quiz.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, quiz });
  } catch (error) {
    console.error('PATCH quiz error:', error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

// PUT - Update full quiz (admin only)
export async function PUT(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const body = await request.json();
    const { id, title, questions, feedbackLink, eventId, startTime, endTime } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

    if (!title || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Title and at least one question are required' }, { status: 400 });
    }

    // Sanitize and validate each question (same as POST)
    const sanitizedQuestions = questions.map((q, i) => {
      const timeLimit = Number(q.timeLimit);
      const correctAnswer = Number(q.correctAnswer);
      if (!q.question || !q.options || q.options.length !== 4) {
        throw new Error(`Question ${i + 1}: Must have text and exactly 4 options`);
      }
      if (Number.isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer > 3) {
        throw new Error(`Question ${i + 1}: Must have a valid correct answer (0-3)`);
      }
      if (Number.isNaN(timeLimit) || timeLimit < 5 || timeLimit > 300) {
        throw new Error(`Question ${i + 1}: Time limit must be between 5 and 300 seconds`);
      }
      return {
        question: String(q.question).trim(),
        options: q.options.map((o) => String(o).trim()),
        correctAnswer: Math.floor(correctAnswer),
        timeLimit: Math.floor(timeLimit),
        imagePath: q.imagePath ? String(q.imagePath) : '',
      };
    });

    const startDate = startTime && String(startTime).trim() ? new Date(startTime) : null;
    const endDate = endTime && String(endTime).trim() ? new Date(endTime) : null;
    if (startDate && Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start time' }, { status: 400 });
    }
    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid end time' }, { status: 400 });
    }

    const quiz = await Quiz.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        questions: sanitizedQuestions,
        feedbackLink: feedbackLink?.trim() || '',
        eventId: eventId != null && eventId !== '' ? parseInt(eventId, 10) : null,
        startTime: startDate,
        endTime: endDate,
      },
      { new: true, runValidators: true }
    );

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, quiz });
  } catch (error) {
    console.error('PUT quiz error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update quiz';
    const isValidation =
      (error.message && error.message.startsWith('Question ')) ||
      error.name === 'ValidationError';
    return NextResponse.json(
      { error: message },
      { status: isValidation ? 400 : 500 }
    );
  }
}
