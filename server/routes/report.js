import { Router } from 'express';

import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import InterviewSession from '../models/InterviewSession.js';
import Report from '../models/Report.js';
import {
  generateInterviewReport,
  renderReportPdf,
  persistReport,
  reportFileName,
} from '../services/pdfService.js';

const router = Router();

/** Load the session and confirm it belongs to the requester. */
const loadOwnedSession = async (req, res) => {
  const { sessionId } = req.params;
  const session = await InterviewSession.findById(sessionId).select('userId');
  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return null;
  }
  if (session.userId.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return null;
  }
  return session;
};

/**
 * GET /api/report/:sessionId/download
 * Stream the PDF report straight from the server. This is the reliable path:
 * it does not depend on Cloudinary delivering raw/PDF files (which is blocked
 * by default on many accounts and caused "Failed to load PDF document").
 */
router.get(
  '/:sessionId/download',
  auth,
  asyncHandler(async (req, res) => {
    const owned = await loadOwnedSession(req, res);
    if (!owned) return undefined;

    const { sessionId } = req.params;
    const { buffer, session } = await renderReportPdf(sessionId);

    // Archive to Cloudinary + persist metadata in the background; never block
    // (or fail) the download on it.
    persistReport(session, buffer).catch((err) =>
      console.warn(`[REPORT] persist failed: ${err.message}`)
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportFileName(session)}"`
    );
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  })
);

/**
 * GET /api/report/:sessionId
 * Return the existing report URL, or generate one on demand.
 * Kept for backward compatibility; the client now uses /download.
 */
router.get(
  '/:sessionId',
  auth,
  asyncHandler(async (req, res) => {
    const owned = await loadOwnedSession(req, res);
    if (!owned) return undefined;

    const { sessionId } = req.params;
    const existing = await Report.findOne({ sessionId });
    if (existing?.pdfUrl) {
      return res.json({ success: true, data: { pdfUrl: existing.pdfUrl } });
    }

    const pdfUrl = await generateInterviewReport(sessionId);
    return res.json({ success: true, data: { pdfUrl } });
  })
);

export default router;
