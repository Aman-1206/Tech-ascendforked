/**
 * Script to add an admin user to the database
 * Usage: node scripts/add-admin.mjs <email>
 * Example: node scripts/add-admin.mjs amankumarschool7@gmail.com
 */

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file manually
try {
  const envPath = join(__dirname, '..', '.env.local');
  const envFile = readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = cleanValue;
      }
    }
  });
} catch (error) {
  // .env.local might not exist, that's okay
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in environment variables');
  console.error('Please make sure .env.local exists with MONGODB_URI set');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('Error: Email address required');
  console.error('Usage: node scripts/add-admin.mjs <email>');
  console.error('Example: node scripts/add-admin.mjs amankumarschool7@gmail.com');
  process.exit(1);
}

// Admin Schema (matches models/Admin.js)
const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

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
      console.log(`Admin with email "${emailLower}" already exists`);
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

addAdmin();
