import puppeteer from 'puppeteer';

import InterviewSession from '../models/InterviewSession.js';
import Report from '../models/Report.js';
import cloudinary from '../config/cloudinary.js';

const httpError = (status, message) => {
  const err = new Error(message);
  err.statusCode = status;
  return err;
};

/** Escape user-provided text before interpolating into the HTML template. */
const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const scoreColor = (score) =>
  score < 50 ? '#EF4444' : score < 75 ? '#F59E0B' : '#10B981';

const CATEGORY_LABEL = {
  technical: 'Technical',
  behavioral: 'Behavioral',
  situational: 'Situational',
};

const SKILL_LABEL = {
  technical: 'Technical',
  communication: 'Communication',
  problemSolving: 'Problem Solving',
  behavioral: 'Behavioral',
  domainKnowledge: 'Domain Knowledge',
};

const fmtDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

/**
 * Build the full multi-page HTML report (all inline CSS, no external deps).
 * Exported separately so it can be unit-tested without launching a browser.
 */
export const buildReportHtml = (session) => {
  const user = session.userId || {};
  const summary = session.aiSummary || {};
  const questions = session.questions || [];

  const score = Math.round(session.overallScore ?? summary.overallScore ?? 0);
  const circumference = 502; // ~ 2 * pi * 80
  const dash = (score / 100) * circumference;
  const color = scoreColor(score);

  const answered = questions.filter((q) => q.userAnswer && q.userAnswer.trim()).length;
  const timeSpent =
    typeof session.duration === 'number'
      ? session.duration
      : Math.round(
          questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0) / 60
        );

  const strengths = summary.strengths || [];
  const weaknesses = summary.weaknesses || [];
  const recommendations = summary.recommendations || [];
  const skillsAnalysis = summary.skillsAnalysis || {};

  // "Skills to focus on": skill axes scoring below 70 (fallback to all axes).
  const focusSkills = Object.entries(skillsAnalysis)
    .filter(([, v]) => Number(v) < 70)
    .map(([k]) => SKILL_LABEL[k] || k);
  const tags = focusSkills.length
    ? focusSkills
    : Object.keys(skillsAnalysis).map((k) => SKILL_LABEL[k] || k);

  const listItems = (items, prefix, prefixColor) =>
    items
      .map(
        (item) =>
          `<li style="margin-bottom:10px;list-style:none;font-size:14px;color:#374151;">
            <span style="color:${prefixColor};font-weight:bold;margin-right:8px;">${prefix}</span>${esc(item)}
          </li>`
      )
      .join('');

  const questionBlocks = questions
    .map((q, i) => {
      const qScore = typeof q.aiScore === 'number' ? q.aiScore : 0;
      const qColor = scoreColor(qScore);
      const exampleBlock = q.exampleAnswer
        ? `<div style="background:#F9FAFB;border-radius:8px;padding:12px;margin-top:10px;font-size:13px;color:#4B5563;">
             <strong style="color:#111827;">Example answer:</strong><br/>${esc(q.exampleAnswer)}
           </div>`
        : '';
      return `
      <div style="page-break-inside:avoid;margin-bottom:28px;">
        <div style="display:flex;align-items:center;margin-bottom:8px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#6D28D9;color:#fff;font-size:13px;font-weight:bold;margin-right:10px;">${i + 1}</span>
          <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#6B7280;">${esc(CATEGORY_LABEL[q.category] || q.category || '')}</span>
        </div>
        <p style="font-size:15px;font-weight:bold;color:#111827;margin:0 0 10px;">${esc(q.questionText)}</p>
        <blockquote style="border-left:4px solid #E5E7EB;background:#F9FAFB;margin:0 0 12px;padding:10px 14px;font-size:14px;color:#4B5563;">
          ${q.userAnswer ? esc(q.userAnswer) : '<em>No answer provided.</em>'}
        </blockquote>
        <div style="background:#E5E7EB;border-radius:6px;height:8px;width:100%;margin-bottom:6px;">
          <div style="background:${qColor};height:8px;border-radius:6px;width:${Math.max(0, Math.min(100, qScore))}%;"></div>
        </div>
        <p style="font-size:12px;color:#6B7280;margin:0 0 10px;">Score: ${qScore}/100</p>
        ${q.aiFeedback ? `<p style="font-size:14px;color:#374151;margin:0;"><strong style="color:#111827;">AI Feedback:</strong> ${esc(q.aiFeedback)}</p>` : ''}
        ${exampleBlock}
        <hr style="border:none;border-top:1px solid #E5E7EB;margin-top:20px;"/>
      </div>`;
    })
    .join('');

  const tagSpans = tags
    .map(
      (t) =>
        `<span style="display:inline-block;background:#F5F3FF;color:#6D28D9;border-radius:9999px;padding:6px 14px;font-size:13px;margin:0 8px 8px 0;">${esc(t)}</span>`
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">

  <!-- PAGE 1: COVER -->
  <section style="min-height:297mm;padding:60px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:#ffffff;">
    <div style="font-size:42px;font-weight:bold;color:#6D28D9;margin-bottom:40px;">InterviewAI</div>
    <div style="font-size:36px;font-weight:bold;margin-bottom:8px;">${esc(user.name || 'Candidate')}</div>
    <div style="font-size:20px;color:#6B7280;margin-bottom:6px;">${esc(session.jobRole || '')}</div>
    <div style="font-size:14px;color:#9CA3AF;margin-bottom:40px;">${fmtDate(session.completedAt || session.createdAt)} &middot; ${esc(timeSpent)} min</div>
    <svg width="200" height="200" viewBox="0 0 200 200" style="margin-bottom:40px;">
      <circle cx="100" cy="100" r="80" fill="none" stroke="#E5E7EB" stroke-width="16"/>
      <circle cx="100" cy="100" r="80" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"
        stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 100 100)"/>
      <text x="100" y="112" text-anchor="middle" font-size="44" font-weight="bold" fill="${color}">${score}</text>
    </svg>
    <div style="background:#6D28D9;color:#ffffff;border-radius:9999px;padding:10px 24px;font-size:14px;font-weight:bold;">AI-Powered Interview Report</div>
  </section>

  <!-- PAGE 2: SUMMARY -->
  <section style="min-height:297mm;padding:60px;box-sizing:border-box;page-break-before:always;background:#ffffff;">
    <h1 style="font-size:26px;color:#111827;margin:0 0 20px;">Executive Summary</h1>
    <p style="font-size:14px;line-height:1.7;color:#374151;margin-bottom:28px;">${esc(summary.summary || 'No summary available.')}</p>

    <div style="display:flex;gap:16px;margin-bottom:32px;">
      <div style="flex:1;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#6D28D9;">${answered}</div>
        <div style="font-size:12px;color:#6B7280;">Questions Answered</div>
      </div>
      <div style="flex:1;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:${color};">${score}</div>
        <div style="font-size:12px;color:#6B7280;">Avg Score</div>
      </div>
      <div style="flex:1;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;text-align:center;">
        <div style="font-size:28px;font-weight:bold;color:#6D28D9;">${esc(timeSpent)}m</div>
        <div style="font-size:12px;color:#6B7280;">Time Spent</div>
      </div>
    </div>

    <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">Strengths</h2>
    <ul style="padding:0;margin:0 0 28px;">${listItems(strengths, '&#10003;', '#10B981') || '<li style="list-style:none;color:#9CA3AF;font-size:14px;">None noted.</li>'}</ul>

    <h2 style="font-size:18px;color:#111827;margin:0 0 12px;">Areas to Improve</h2>
    <ul style="padding:0;margin:0;">${listItems(weaknesses, '&#9888;', '#F59E0B') || '<li style="list-style:none;color:#9CA3AF;font-size:14px;">None noted.</li>'}</ul>
  </section>

  <!-- PAGES 3+: QUESTION BREAKDOWN -->
  <section style="padding:60px;box-sizing:border-box;page-break-before:always;background:#ffffff;">
    <h1 style="font-size:26px;color:#111827;margin:0 0 24px;">Question Breakdown</h1>
    ${questionBlocks || '<p style="color:#9CA3AF;">No questions recorded.</p>'}
  </section>

  <!-- LAST PAGE: RECOMMENDATIONS -->
  <section style="min-height:297mm;padding:60px;box-sizing:border-box;page-break-before:always;background:#ffffff;">
    <h1 style="font-size:26px;color:#111827;margin:0 0 20px;">Recommendations</h1>
    <ol style="padding-left:20px;margin:0 0 32px;">
      ${
        recommendations.length
          ? recommendations
              .map(
                (r) =>
                  `<li style="margin-bottom:12px;font-size:14px;color:#374151;line-height:1.6;">${esc(r)}</li>`
              )
              .join('')
          : '<li style="font-size:14px;color:#9CA3AF;">No recommendations.</li>'
      }
    </ol>

    <h2 style="font-size:18px;color:#111827;margin:0 0 14px;">Skills to focus on</h2>
    <div>${tagSpans || '<span style="color:#9CA3AF;font-size:13px;">No specific skills flagged.</span>'}</div>

    <hr style="border:none;border-top:1px solid #E5E7EB;margin:40px 0 16px;"/>
    <p style="font-size:11px;color:#9CA3AF;text-align:center;">Generated by InterviewAI &middot; Session ID: ${esc(session._id)} &middot; ${fmtDate(Date.now())}</p>
  </section>

</body></html>`;
};

/** Upload a PDF buffer to Cloudinary (raw resource in the reports folder). */
const uploadPdf = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'reports', format: 'pdf' },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });

/** Build a filesystem-safe download filename for a session's report. */
export const reportFileName = (session) => {
  const slug =
    (session?.userId?.name || 'candidate')
      .toString()
      .trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'candidate';
  return `interview-report-${slug}.pdf`;
};

/**
 * Render the interview report to a PDF buffer. No Cloudinary involved, so this
 * works regardless of the Cloudinary account's PDF/raw delivery settings.
 * @param {string} sessionId
 * @returns {Promise<{ buffer: Buffer, session: object }>}
 */
export const renderReportPdf = async (sessionId) => {
  const session = await InterviewSession.findById(sessionId)
    .populate('userId')
    .populate('resumeId');

  if (!session) throw httpError(404, 'Session not found');

  const html = buildReportHtml(session);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0' },
    });
    return { buffer, session };
  } finally {
    await browser.close();
  }
};

/**
 * Persist (or refresh) the report record for a session. Uploading to Cloudinary
 * is best-effort: if the account blocks raw/PDF delivery or is misconfigured,
 * we still save the report metadata so the direct-download endpoint keeps working.
 * @returns {Promise<string|null>} the Cloudinary PDF URL, or null if upload failed
 */
export const persistReport = async (session, buffer) => {
  const sessionId = session._id;
  let report = await Report.findOne({ sessionId });

  let pdfUrl = null;
  try {
    const uploadResult = await uploadPdf(buffer);
    pdfUrl = uploadResult.secure_url;
  } catch (err) {
    // Non-fatal: the report is downloaded directly from the server.
    console.warn(`[REPORT] Cloudinary upload skipped: ${err.message}`);
  }

  const summary = session.aiSummary || {};
  if (!report) {
    report = new Report({
      sessionId,
      userId: session.userId?._id || session.userId,
    });
  }
  if (pdfUrl) report.pdfUrl = pdfUrl;
  report.generatedAt = new Date();
  report.strengths = summary.strengths || [];
  report.weaknesses = summary.weaknesses || [];
  report.recommendations = summary.recommendations || [];
  report.scoreBreakdown = summary.skillsAnalysis || {};
  await report.save();

  return pdfUrl;
};

/**
 * Generate the PDF, upload it to Cloudinary (best-effort), and persist its URL.
 * Retained for callers that want a hosted URL.
 * @param {string} sessionId
 * @returns {Promise<string|null>} the Cloudinary PDF URL (or null on upload failure)
 */
export const generateInterviewReport = async (sessionId) => {
  const { buffer, session } = await renderReportPdf(sessionId);
  return persistReport(session, buffer);
};

export default {
  generateInterviewReport,
  renderReportPdf,
  persistReport,
  reportFileName,
  buildReportHtml,
};
