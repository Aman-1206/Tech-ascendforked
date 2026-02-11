import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a name for this event.'],
    maxlength: [100, 'Name cannot be more than 100 characters'],
  },
  tagline: {
    type: String,
    maxlength: [200, 'Tagline cannot be more than 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please provide a description.'],
  },
  image: {
    type: String, // Emoji or placeholder
  },
  imagePath: {
    type: String, // Path to uploaded image
  },
  mobileImagePath: {
    type: String, // Path to uploaded mobile image
  },
  date: String,
  time: String,
  duration: String,
  mode: {
    type: String,
    enum: ['Online', 'Offline', 'Hybrid'],
    default: 'Offline',
  },
  location: String,
  category: String,
  teamSize: String,
  registrationDeadline: String, // Display string
  deadline: String, // ISO String for automation
  registrationOpen: {
    type: Boolean,
    default: true,
  },
  prizes: [String],
  requirements: [String],
  highlights: [String],
  // Submission fields (shown after registration closes)
  problemStatement: {
    type: String, // Task/problem description for participants
  },
  submissionType: {
    type: String,
    enum: ['none', 'file', 'drive', 'both'],
    default: 'none', // Admin chooses: none, file upload, drive link, or both
  },
  driveLink: {
    type: String, // Google Drive folder link for submissions
  },
  submissionDeadline: {
    type: String, // Deadline for submissions
  },
  maxFileSize: {
    type: Number, // Max file size in MB (default 10MB)
    default: 10,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Event || mongoose.model('Event', EventSchema);
