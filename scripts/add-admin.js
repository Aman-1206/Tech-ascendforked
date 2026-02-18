/**
 * Script to add an admin user to the database
 * Usage: node scripts/add-admin.js <email>
 * Example: node scripts/add-admin.js amankumarschool7@gmail.com
 */

import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in environment variables');
  console.error('Please make sure .env.local exists with MONGODB_URI set');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('Error: Email address required');
  console.error('Usage: node scripts/add-admin.js <email>');
  console.error('Example: node scripts/add-admin.js amankumarschool7@gmail.com');
  process.exit(1);
}

async function addAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const emailLower = email.toLowerCase().trim();
    
    // Check if admin already exists
    const existing = await Admin.findOne({ email: emailLower });
    if (existing) {
      console.log(`✓ Admin with email "${emailLower}" already exists`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create new admin
    await Admin.create({ email: emailLower });
    console.log(`✓ Successfully added admin: ${emailLower}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error adding admin:', error.message);
    if (error.code === 11000) {
      console.log(`Admin with email "${email.toLowerCase()}" already exists`);
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

addAdmin();
