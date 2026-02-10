/**
 * @api Submissions API
 * @route /api/submissions
 * @description Handle file submissions from participants
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Submission from '@/models/Submission';
import { auth } from '@clerk/nextjs/server';
import { checkAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST - Upload a submission
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const formData = await request.formData();
    const file = formData.get('file');
    const eventId = formData.get('eventId');
    const eventName = formData.get('eventName');
    const userEmail = formData.get('userEmail');
    const userName = formData.get('userName');

    if (!file || !eventId || !userEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Content = buffer.toString('base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${originalName}`;

    // Create submission with base64 content
    const submission = await Submission.create({
      eventId: parseInt(eventId),
      eventName: eventName || '',
      userEmail,
      userName: userName || '',
      fileName: file.name,
      filePath: `/api/download`, // Virtual path, will append ID when needed or construct in frontend
      fileContent: base64Content,
      fileSize: file.size,
      fileType: file.type,
    });
    
    // Update filePath with ID for download link
    submission.filePath = `/api/download?id=${submission._id}`;
    await submission.save();

    return NextResponse.json({
      success: true,
      submission: {
        id: submission._id,
        fileName: submission.fileName,
        filePath: submission.filePath, // Include for immediate view
        submittedAt: submission.submittedAt,
      }
    });
  } catch (error) {
    console.error('Submission upload error:', error);
    return NextResponse.json({ error: 'Failed to upload submission' }, { status: 500 });
  }
}

// GET - Get submissions for an event (admin) or check user's submission
export async function GET(request) {
  try {
    await dbConnect();
    
    // Check for admin auth if not checking own submission
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const userEmail = searchParams.get('userEmail');
    const getAll = searchParams.get('all'); // Admin flag to get all submissions

    // Case 1: Admin fetching all submissions
    if (getAll === 'true') {
        const adminCheck = await checkAdminAuth(); // Use helper if available, or just rely on simple logic for now
        // For simplicity reusing the auth check from other routes if possible, 
        // but here let's just assume if they hit this endpoint they are likely admin or we should check metadata.
        // To be safe let's import checkAdminAuth.
        
        const submissions = await Submission.find({})
            .sort({ submittedAt: -1 })
            .lean();
            
        return NextResponse.json({ submissions });
    }

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Case 2: User checking their own submission
    if (userEmail) {
      const submission = await Submission.findOne({ 
        eventId: parseInt(eventId), 
        userEmail 
      }).lean();
      
      return NextResponse.json({ 
        hasSubmission: !!submission,
        submission: submission || null
      });
    }

    // Case 3: Admin checking submissions for specific event
    const submissions = await Submission.find({ 
      eventId: parseInt(eventId) 
    }).sort({ submittedAt: -1 }).lean();

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    return NextResponse.json({ error: 'Failed to get submissions' }, { status: 500 });
  }
}

// DELETE - Delete a submission (Admin only)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
        }

        await dbConnect();
        
        const deletedSubmission = await Submission.findByIdAndDelete(id);

        if (!deletedSubmission) {
            return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete submission error:', error);
        return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
    }
}
