import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Download,
  RotateCcw,
  Share2,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageWrapper from '../components/layout/PageWrapper';
import api from '../services/api';

const CIRCUMFERENCE = 314; // 2 * pi * 50

const scoreColor = (s) => {
  if (s >= 75) return '#22c55e';
  if (s >= 50) return '#f59e0b';
  return '#ef4444';
};

const HeroScore = ({ score }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const target = Math.max(0, Math.min(100, score));
    const interval = setInterval(() => {
      current += 1;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setDisplay(current);
    }, 16);
    return () => clearInterval(interval);
  }, [score]);

  const offset = CIRCUMFERENCE * (1 - display / 100);
  const color = scoreColor(score);

  return (
    <div className="relative h-[120px] w-[120px]">
      <svg className="h-[120px] w-[120px] -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          strokeWidth="10"
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {display}
        </span>
      </div>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
    <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">{title}</h3>
    {children}
  </div>
);

const QuestionRow = ({ q, index }) => {
  const [open, setOpen] = useState(false);
  const truncated =
    q.questionText?.length > 60 ? `${q.questionText.slice(0, 60)}...` : q.questionText;
  const color = scoreColor(q.aiScore ?? 0);

  return (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <span className="font-medium">Q{index + 1}.</span> {truncated}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {q.aiScore ?? '—'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-4 text-sm">
              <p className="font-medium text-slate-800 dark:text-slate-100">{q.questionText}</p>
              {q.userAnswer && (
                <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-3 text-slate-600 dark:text-slate-300">
                  {q.userAnswer}
                </blockquote>
              )}
              {q.aiFeedback && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">Feedback: </span>
                  <span className="text-slate-600 dark:text-slate-400">{q.aiFeedback}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    api
      .get(`/interview/${id}`)
      .then(({ data }) => mounted.current && setSession(data.data))
      .catch((err) =>
        toast.error(err.response?.data?.message || 'Failed to load results')
      )
      .finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, [id]);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      // Stream the PDF straight from the API (sends the JWT via the axios
      // interceptor) and save it as a blob — no Cloudinary redirect involved.
      const { data, headers } = await api.get(`/report/${id}/download`, {
        responseType: 'blob',
      });

      const disposition = headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `interview-report-${id}.pdf`;

      const blob = new Blob([data], {
        type: headers['content-type'] || 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err) {
      // With responseType 'blob' an error body is a Blob, so read it as text.
      let message = 'Could not generate report';
      try {
        const text = await err.response?.data?.text?.();
        if (text) message = JSON.parse(text).message || message;
      } catch {
        /* fall back to the default message */
      }
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  const shareScore = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </PageWrapper>
    );
  }

  if (!session) {
    return (
      <PageWrapper>
        <div className="py-20 text-center text-slate-500">Results not found.</div>
      </PageWrapper>
    );
  }

  const summary = session.aiSummary || {};
  const score = session.overallScore ?? summary.overallScore ?? 0;

  return (
    <PageWrapper>
      {/* Hero */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
        <HeroScore score={score} />
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {score}% better than other candidates
          </p>
          <p className="text-slate-500 dark:text-slate-400">{session.jobRole}</p>
        </div>
      </div>

      {/* 4 cards */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card title="AI Summary">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {summary.summary || 'No summary available.'}
          </p>
        </Card>

        <Card title="Strengths">
          <ul className="space-y-2">
            {(summary.strengths || []).map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> {s}
              </li>
            ))}
            {!(summary.strengths || []).length && (
              <li className="text-sm text-slate-400">None noted.</li>
            )}
          </ul>
        </Card>

        <Card title="Areas to improve">
          <ul className="space-y-2">
            {(summary.weaknesses || []).map((w, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" /> {w}
              </li>
            ))}
            {!(summary.weaknesses || []).length && (
              <li className="text-sm text-slate-400">None noted.</li>
            )}
          </ul>
        </Card>

        <Card title="Next steps">
          <ol className="space-y-2">
            {(summary.recommendations || []).map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
            {!(summary.recommendations || []).length && (
              <li className="text-sm text-slate-400">None noted.</li>
            )}
          </ol>
        </Card>
      </div>

      {/* Question breakdown */}
      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">
          Question breakdown
        </h3>
        {(session.questions || []).map((q, i) => (
          <QuestionRow key={i} q={q} index={i} />
        ))}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={downloadReport}
          disabled={downloading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download report
        </button>
        <button
          type="button"
          onClick={() => navigate('/upload')}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RotateCcw className="h-4 w-4" /> Practice again
        </button>
        <button
          type="button"
          onClick={shareScore}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Share2 className="h-4 w-4" /> Share score
        </button>
      </div>
    </PageWrapper>
  );
};

export default Results;
