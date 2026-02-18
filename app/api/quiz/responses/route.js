/**
 * @api Quiz Responses
 * @route /api/quiz/responses
 * @description Fetch quiz responses (admin only)
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import QuizResponse from '@/models/QuizResponse';
import { checkAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all quiz responses (admin only)
export async function GET(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const quizId = searchParams.get('quizId');

    let query = {};
    if (quizId) {
      query.quizId = quizId;
    }

    const responses = await QuizResponse.find(query)
      .sort({ submittedAt: -1 })
      .lean();

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('GET quiz responses error:', error);
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}

// DELETE - Delete a single quiz response (admin only)
export async function DELETE(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing response ID' }, { status: 400 });
    }

    const result = await QuizResponse.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE quiz response error:', error);
    return NextResponse.json({ error: 'Failed to delete response' }, { status: 500 });
  }
}
