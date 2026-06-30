import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, ArrowRight, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

import useInterview, { formatMMSS } from '../hooks/useInterview';
import QuestionScoreCard from '../components/QuestionScoreCard';

const DEFAULT_QUESTION_TIME = 120;
const CIRCUMFERENCE = 251; // 2 * pi * 40

const CATEGORY_STYLES = {
  technical: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  behavioral:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  situational:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const DIFFICULTY_STYLES = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  medium:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

/** Timer ring color by fraction of time remaining. */
const timerStroke = (fraction) => {
  if (fraction > 0.5) return '#22c55e';
  if (fraction >= 0.25) return '#f59e0b';
  return '#ef4444';
};

const TimerRing = ({ secondsLeft, totalSeconds }) => {
  const fraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fraction)));
  const stroke = timerStroke(fraction);
  return (
    <div className="relative h-28 w-28">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          {formatMMSS(secondsLeft)}
        </span>
      </div>
    </div>
  );
};

const InterviewSession = () => {
  const {
    loading,
    status,
    currentIndex,
    currentQuestion,
    totalQuestions,
    currentAnswer,
    questionTimer,
    elapsedFormatted,
    answeredCount,
    avgScore,
    submitting,
    ending,
    submitAnswer,
    nextQuestion,
    endSession,
    isLastQuestion,
  } = useInterview();

  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const questionStartRef = useRef(Date.now());

  const totalSeconds = currentQuestion?.timeRecommended || DEFAULT_QUESTION_TIME;
  const wordCount = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text]
  );

  // Reset per-question local state when the question changes.
  useEffect(() => {
    setText('');
    questionStartRef.current = Date.now();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [currentIndex]);

  // Auto-expand the textarea to fit content.
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text]);

  // Stop voice recognition on unmount.
  useEffect(() => () => recognitionRef.current?.stop?.(), []);

  const toggleVoice = () => {
    if (recording) {
      recognitionRef.current?.stop?.();
      setRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) {
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast.error('Please enter an answer');
      return;
    }
    if (recording) {
      recognitionRef.current?.stop?.();
      setRecording(false);
    }
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    await submitAnswer(text.trim(), timeSpent);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (status === 'error' || !currentQuestion) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-500">
        Unable to load this interview session.
      </div>
    );
  }

  const progressPct = ((currentIndex + 1) / totalQuestions) * 100;
  const answered = Boolean(currentAnswer);

  return (
    <div className="min-h-screen pb-24">
      {/* Top progress */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Question {currentIndex + 1} of {totalQuestions}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <motion.div
            className="h-full rounded-full bg-indigo-600"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ ease: 'easeOut', duration: 0.4 }}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto mt-6 grid max-w-6xl gap-6 px-4 lg:grid-cols-5">
        {/* LEFT */}
        <div className="space-y-5 lg:col-span-3">
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                CATEGORY_STYLES[currentQuestion.category] || CATEGORY_STYLES.technical
              }`}
            >
              {currentQuestion.category}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                DIFFICULTY_STYLES[currentQuestion.difficulty] || DIFFICULTY_STYLES.medium
              }`}
            >
              {currentQuestion.difficulty}
            </span>
          </div>

          <h2 className="text-xl font-medium leading-relaxed text-slate-900 dark:text-slate-100">
            {currentQuestion.questionText}
          </h2>

          <div className="flex justify-center pt-2">
            <TimerRing secondsLeft={questionTimer} totalSeconds={totalSeconds} />
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4 lg:col-span-2">
          {!answered && (
            <>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type or dictate your answer..."
                  className="min-h-32 w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{wordCount} words</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={toggleVoice}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    recording
                      ? 'border-red-300 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-950/30'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {recording && (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  )}
                  <Mic className="h-4 w-4" />
                  {recording ? 'Listening...' : 'Voice'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Scoring...' : 'Submit answer'}
              </button>
            </>
          )}

          <AnimatePresence>
            {answered && (
              <div className="space-y-4">
                <QuestionScoreCard result={currentAnswer} />
                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={endSession}
                    disabled={ending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
                  >
                    {ending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Flag className="h-4 w-4" />
                    )}
                    Finish interview
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextQuestion}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700"
                  >
                    Next question <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-sm">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-300">
            <span className="tabular-nums">{elapsedFormatted}</span>
            <span className="hidden sm:inline">
              {answeredCount}/{totalQuestions} answered
            </span>
            <span className="hidden sm:inline">Avg: {avgScore}/100</span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            End early
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                End interview early?
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                We&apos;ll score what you&apos;ve answered so far and generate your
                report.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Keep going
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    endSession();
                  }}
                  disabled={ending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {ending && <Loader2 className="h-4 w-4 animate-spin" />}
                  End now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InterviewSession;
