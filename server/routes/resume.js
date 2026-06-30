import { Router } from 'express';
// Import the internal module directly to avoid pdf-parse's debug bootstrap,
// which tries to read a sample PDF when loaded as the main module under ESM.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

import Resume from '../models/Resume.js';
import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import uploadMiddleware from '../middleware/upload.js';
import { parseResume } from '../services/aiService.js';
import cloudinary, { uploadToCloudinary } from '../config/cloudinary.js';

const router = Router();

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Wrap multer so file-type / size errors become clean 4xx responses instead of
 * a generic 500 from the global handler.
 */
const handleUpload = (req, res, next) =>
  uploadMiddleware.single('resume')(req, res, (err) => {
    if (err) {
      err.statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.statusCode || 400);
      if (err.code === 'LIMIT_FILE_SIZE') err.message = 'File exceeds the 5MB limit';
      return next(err);
    }
    return next();
  });

/**
 * Extract plain text from an uploaded buffer.
 * - PDF: real extraction via pdf-parse
 * - DOCX: placeholder (base64). Real extraction needs a dedicated parser such
 *   as `mammoth`; flagged for a follow-up.
 * - other (e.g. text): utf-8 decode
 */
const extractText = async (file) => {
  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(file.buffer);
    return data.text;
  }
  if (file.mimetype === DOCX_MIME) {
    // TODO: integrate `mammoth` for real DOCX text extraction.
    return file.buffer.toString('base64');
  }
  return file.buffer.toString('utf8');
};

/**
 * POST /api/resume/upload
 * Extract text -> AI parse -> store file in Cloudinary -> persist Resume.
 */
router.post(
  '/upload',
  auth,
  handleUpload,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const text = await extractText(req.file);

    // AI structuring of the extracted text.
    const parsed = await parseResume(text);

    // Store the original document. Resumes (pdf/docx) are non-image -> 'raw'.
    const uploadResult = await uploadToCloudinary(req.file.buffer, 'resumes', 'raw');

    const resume = await Resume.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      parsedText: text,
      skills: parsed.skills || [],
      experience: parsed.experience || [],
      education: parsed.education || [],
    });

    return res.status(201).json({
      success: true,
      data: { resume, summary: parsed.summary || '' },
      message: 'Resume uploaded and parsed',
    });
  })
);

/**
 * GET /api/resume/list
 * All resumes for the authenticated user, newest first.
 */
router.get(
  '/list',
  auth,
  asyncHandler(async (req, res) => {
    const resumes = await Resume.find({ userId: req.user._id }).sort({
      uploadedAt: -1,
    });
    return res.json({ success: true, data: resumes });
  })
);

/**
 * DELETE /api/resume/:id
 * Verify ownership, remove from Cloudinary, then delete the document.
 */
router.delete(
  '/:id',
  auth,
  asyncHandler(async (req, res) => {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    if (resume.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (resume.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(resume.cloudinaryPublicId, {
        resource_type: 'raw',
      });
    }

    await resume.deleteOne();

    return res.json({ success: true, message: 'Resume deleted' });
  })
);

export default router;
