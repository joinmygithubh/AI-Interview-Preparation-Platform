import { Router } from 'express';

import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import InterviewSession from '../models/InterviewSession.js';
import Report from '../models/Report.js';
import { generateInterviewReport } from '../services/pdfService.js';

const router = Router();

/**
 * GET /api/report/:sessionId
 * Return the existing report URL, or generate one on demand.
 */
router.get(
  '/:sessionId',
  auth,
  asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    // Verify the session exists and belongs to the requester.
    const session = await InterviewSession.findById(sessionId).select('userId');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const existing = await Report.findOne({ sessionId });
    if (existing?.pdfUrl) {
      return res.json({ success: true, data: { pdfUrl: existing.pdfUrl } });
    }

    const pdfUrl = await generateInterviewReport(sessionId);
    return res.json({ success: true, data: { pdfUrl } });
  })
);

export default router;
