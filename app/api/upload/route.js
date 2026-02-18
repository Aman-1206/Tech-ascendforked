/**
 * @api Upload API
 * @route /api/upload
 * @description Image upload for events (admin only)
 * @methods POST (upload image)
 * 
 * Images are stored as base64 data URIs in MongoDB (via the Event model's imagePath field).
 * This ensures images persist on serverless deployments (e.g., Vercel) where the filesystem is ephemeral.
 */
import { NextResponse } from 'next/server';
import { checkAdminAuth, validateImageFile } from '@/lib/auth';

// Force dynamic rendering for authenticated routes
export const dynamic = 'force-dynamic';

// Map file extensions to MIME types
function getMimeType(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/png';
}

// POST - Handle image upload (PROTECTED - Admin only)
export async function POST(request) {
  try {
    // Require admin authentication (session cookie must be sent; add your email via /setup-admin or ADMIN_EMAILS in .env.local)
    const { isAdmin, error } = await checkAdminAuth();
    if (!isAdmin) {
      return error;
    }

    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    
    // Validate file type and size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    
    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Additional check: verify file magic bytes (first few bytes indicate file type)
    const magicBytes = buffer.slice(0, 4);
    const isValidImage = 
      // JPEG
      (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) ||
      // PNG
      (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) ||
      // GIF
      (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46) ||
      // WebP (RIFF....WEBP)
      (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46);
    
    if (!isValidImage) {
      return NextResponse.json({ 
        error: 'Invalid image file. File content does not match a valid image format.' 
      }, { status: 400 });
    }
    
    // Convert to base64 data URI — this gets stored in MongoDB via the Event's imagePath field
    const mimeType = file.type || getMimeType(file.name);
    const base64String = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64String}`;
    
    return NextResponse.json({ 
      success: true, 
      imagePath: dataUri,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
