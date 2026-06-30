import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    duration: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    year: { type: String, trim: true },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  parsedText: {
    type: String,
    default: '',
  },
  skills: {
    type: [String],
    default: [],
  },
  experience: {
    type: [experienceSchema],
    default: [],
  },
  education: {
    type: [educationSchema],
    default: [],
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

const Resume = mongoose.model('Resume', resumeSchema);

export default Resume;
