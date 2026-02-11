import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';

// Helper to get admins from DB
async function getAdminEmails() {
  try {
    await dbConnect();
    const admins = await Admin.find({}).lean();
    return admins.map(a => a.email.toLowerCase());
  } catch (error) {
    console.error('Error fetching admins:', error);
    return [];
  }
}

// Fallback for initial setup if DB is empty or unreachable
const ENV_ADMINS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()) : [];

/**
 * Check if a user is authenticated and is an admin
 * @returns {Promise<{isAdmin: boolean, user: object|null, error: NextResponse|null}>}
 */
export async function checkAdminAuth() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        isAdmin: false,
        user: null,
        error: NextResponse.json(
          { error: 'Unauthorized - Please sign in' },
          { status: 401 }
        )
      };
    }

    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    
    // Get admins from DB
    const dbAdmins = await getAdminEmails();
    // Combine with ENV admins
    const allAdmins = [...new Set([...dbAdmins, ...ENV_ADMINS])];

    if (!userEmail || !allAdmins.includes(userEmail)) {
      return {
        isAdmin: false,
        user: user,
        error: NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        )
      };
    }

    return {
      isAdmin: true,
      user: user,
      error: null
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      isAdmin: false,
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    };
  }
}

/**
 * Check if a user is authenticated (not necessarily admin)
 * @returns {Promise<{isAuthenticated: boolean, user: object|null, error: NextResponse|null}>}
 */
export async function checkAuth() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return {
        isAuthenticated: false,
        user: null,
        error: NextResponse.json(
          { error: 'Unauthorized - Please sign in' },
          { status: 401 }
        )
      };
    }

    const user = await currentUser();
    
    return {
      isAuthenticated: true,
      user: user,
      error: null
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return {
      isAuthenticated: false,
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      )
    };
  }
}

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

// Max file size (1MB)
export const MAX_FILE_SIZE = 1 * 1024 * 1024;

/**
 * Validate uploaded file
 * @param {File} file 
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  return { valid: true, error: null };
}
