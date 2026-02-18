/**
 * @api Registrations API
 * @route /api/registrations
 * @description CRUD operations for event registrations
 * @methods GET (fetch), POST (create), DELETE (remove - admin only)
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Registration from '@/models/Registration';
import Event from '@/models/Event';
import { checkAdminAuth, checkAuth } from '@/lib/auth';
export const dynamic = 'force-dynamic';

// GET - Fetch all registrations or specific user's
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const eventId = searchParams.get('eventId');
    
    // Check specific registration (Protected: User matching email OR Admin)
    if (email && eventId) {
      // 1. Check if user is authenticated and matches email
      const auth = await checkAuth();
      const userEmail = auth.user?.primaryEmailAddress?.emailAddress?.toLowerCase();
      
      let isAuthorized = false;

      // check if user is checking their own registration
      if (auth.isAuthenticated && userEmail === email.toLowerCase()) {
        isAuthorized = true;
      } 
      
      // If not own, check if admin
      if (!isAuthorized) {
        const adminAuth = await checkAdminAuth();
        if (adminAuth.isAdmin) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        // Return 403 Forbidden to prevent enumeration
        // Or just return false to hide existence (more secure but less helpful)
        // Let's return isRegistered: false for unauthorized to prevent easy enumeration errors 
        // while still protecting the data, OR return 401/403. 
        // Returning 403 is safer for "security audit" style requests.
        return NextResponse.json({ error: 'Unauthorized to check registration status' }, { status: 403 });
      }

      const registration = await Registration.findOne({ 
        email: email.toLowerCase(), 
        eventId: parseInt(eventId) 
      }).lean();
      
      return NextResponse.json({ isRegistered: !!registration });
    }
    
    // User checking their own registrations list
    if (email && !eventId) {
      const authCheck = await checkAuth();
      if (!authCheck.isAuthenticated) return authCheck.error;
      
      const userEmail = authCheck.user.primaryEmailAddress.emailAddress.toLowerCase();
      if (email.toLowerCase() !== userEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      const registrations = await Registration.find({ email: email.toLowerCase() }).lean();
      return NextResponse.json({ registrations });
    }

    // Admin: Fetch all registrations or dashboard stats
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    const isDashboard = searchParams.get('dashboard') === 'true';

    if (isDashboard) {
      const [totalCount, recentRegistrations] = await Promise.all([
        Registration.countDocuments({}),
        Registration.find({}).sort({ registeredAt: -1 }).limit(5).lean()
      ]);
      
      return NextResponse.json({ 
        stats: {
          total: totalCount,
          recent: recentRegistrations
        }
      });
    }
    
    const registrations = await Registration.find({}).sort({ registeredAt: -1 }).lean();
    return NextResponse.json({ registrations });
  } catch (error) {
    console.error('GET registrations error:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}

// POST - Create new registration
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, course, year, college, phone, eventId } = body;
    
    if (!name || !email || !eventId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Event Exists
    const event = await Event.findOne({ id: parseInt(eventId) });
    if (!event) {
       return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if registration is open for this event
    if (!event.registrationOpen) {
        return NextResponse.json({ error: 'Registration is closed for this event' }, { status: 400 });
    }
    
    // Check existing registration
    const existing = await Registration.findOne({ 
      email: email.toLowerCase(), 
      eventId: parseInt(eventId) 
    });
    
    if (existing) {
      return NextResponse.json({ 
        error: 'Already registered', 
        alreadyRegistered: true 
      }, { status: 409 });
    }
    
    const newRegistration = await Registration.create({
      id: Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      course: (course || 'Not specified').trim(),
      year: (year || 'Not specified').trim(),
      college: (college || 'Not specified').trim(),
      phone: (phone || 'Not provided').trim(),
      eventId: parseInt(eventId),
      eventName: event.name.trim() // Use trusted event name from DB
    });

    // Send confirmation email (non-blocking — don't delay the response)

    
    return NextResponse.json({ 
      success: true, 
      registration: newRegistration 
    }, { status: 201 });
  } catch (error) {
    console.error('POST registration error:', error);
    if (error.code === 11000) {
       return NextResponse.json({ 
        error: 'Already registered', 
        alreadyRegistered: true 
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
  }
}

// DELETE - Remove registration (Admin only)
export async function DELETE(request) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) return error;

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing registration ID' }, { status: 400 });
    }
    
    const result = await Registration.findOneAndDelete({ id: parseInt(id) }); // Use our custom ID
    // Note: If you want to use MongoDB _id, pass that. But frontend sends timestamp ID currently.
    
    if (!result) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE registration error:', error);
    return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 });
  }
}
