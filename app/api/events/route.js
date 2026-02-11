/**
 * @api Events API
 * @route /api/events
 * @description CRUD operations for events
 * @methods GET (public), POST/PUT/DELETE (admin only)
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import { checkAdminAuth } from '@/lib/auth';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';

// GET - Fetch all events or single event by ID (PUBLIC)
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const event = await Event.findOne({ id: parseInt(id) }).lean();
      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      return NextResponse.json({ event });
    }
    
    // Sort by ID descending (newest first)
    const events = await Event.find({}).sort({ id: -1 }).lean();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('GET events error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// PUT - Update an event (PROTECTED - Admin only)
export async function PUT(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) {
      return error;
    }

    await dbConnect();
    const body = await request.json();
    const { id, ...eventData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    // Sanitize string fields (optional, but good practice)
    // Mongoose handles most validation, but we can trim strings here if needed
    if (eventData.description) eventData.description = String(eventData.description).trim();

    const updatedEvent = await Event.findOneAndUpdate(
      { id: parseInt(id) },
      { $set: eventData },
      { new: true, runValidators: true } // Return updated doc, run schema validators
    ).lean();
    
    if (!updatedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      event: updatedEvent 
    });
  } catch (error) {
    console.error('PUT event error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// POST - Create a new event (PROTECTED - Admin only)
export async function POST(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) {
      return error;
    }

    await dbConnect();
    const body = await request.json();
    
    // Generate new ID (find max ID and increment)
    // Note: In high currency this isn't atomic, but for an admin panel it's fine.
    const lastEvent = await Event.findOne().sort({ id: -1 });
    const nextId = lastEvent ? lastEvent.id + 1 : 1;
    
    // Default values are handled by Mongoose Schema defaults where possible
    // But we map body fields to match our Schema structure
    const newEventData = {
      id: nextId,
      name: body.name || 'New Event',
      tagline: body.tagline || '',
      description: body.description ? String(body.description).trim() : '',
      image: body.image || '📅',
      imagePath: body.imagePath || null,
      mobileImagePath: body.mobileImagePath || null,
      date: body.date || '',
      time: body.time || '',
      duration: body.duration || '',
      mode: body.mode || 'Offline',
      location: body.location || '',
      category: body.category || '',
      teamSize: body.teamSize || 'Individual',
      registrationDeadline: body.registrationDeadline || '',
      deadline: body.deadline || '',
      registrationOpen: body.registrationOpen !== undefined ? body.registrationOpen : true,
      prizes: body.prizes || [],
      requirements: body.requirements || [],
      highlights: body.highlights || [],
      // Submission fields
      problemStatement: body.problemStatement || '',
      submissionType: body.submissionType || 'none',
      driveLink: body.driveLink || '',
      submissionDeadline: body.submissionDeadline || '',
      maxFileSize: body.maxFileSize || 10,
    };
    
    const newEvent = await Event.create(newEventData);
    
    return NextResponse.json({ 
      success: true, 
      event: newEvent 
    }, { status: 201 });
  } catch (error) {
    console.error('POST event error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to create event',
      details: error.errors // Return validation details if available
    }, { status: 500 });
  }
}

// DELETE - Delete an event (PROTECTED - Admin only)
export async function DELETE(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) {
      return error;
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }
    
    const deletedEvent = await Event.findOneAndDelete({ id: parseInt(id) });
    
    if (!deletedEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE event error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
