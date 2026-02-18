/**
 * @api Setup Admin (One-time use)
 * @route /api/setup-admin
 * @description One-time endpoint to add an admin user
 * @methods POST
 * 
 * SECURITY NOTE: This endpoint should be removed or secured after initial setup.
 * For production, use the /api/admins endpoint which requires admin authentication.
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await dbConnect();
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if admin already exists
    const existing = await Admin.findOne({ email: emailLower });
    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: `Admin with email "${emailLower}" already exists`,
        email: emailLower
      });
    }

    // Create new admin
    await Admin.create({ email: emailLower });
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully added admin: ${emailLower}`,
      email: emailLower
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: true,
        message: `Admin with email "${email.toLowerCase()}" already exists`,
        email: email.toLowerCase()
      });
    }
    return NextResponse.json({ error: 'Failed to add admin', details: error.message }, { status: 500 });
  }
}
