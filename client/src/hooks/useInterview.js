import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import api from '../services/api';

const DEFAULT_QUESTION_TIME = 120; // fallback when the question has no timeRecommended

/** Format a number of seconds as MM:SS. */
export const formatMMSS = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

/**
 * Drives a live interview session: data fetching, per-question countdown,
 * session stopwatch, answer submission/scoring, navigation, and resilient
 * sessionStorage persistence of progress.
 */
const useInterview = (sessionIdArg) => {
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = sessionIdArg || params.id;
  const storageKey = `interview:${sessionId}`;

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [status, setStatus] = useState('loading');
  const [questionTimer, setQuestionTimer] = useState(DEFAULT_QUESTION_TIME);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);

  // Skip the first persistence run so default state can't clobber restored data.
  const skipPersist = useRef(true);

  const questions = sessionData?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || null;
  const answeredCount = answers.filter((a) => a && typeof a.aiScore === 'number').length;
  const scored = answers.filter((a) => a && typeof a.aiScore === 'number');
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, a) => sum + a.aiScore, 0) / scored.length)
    : 0;

  // --- Restore progress, then fetch the session ---
  useEffect(() => {
    let cancelled = false;

    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Number.isInteger(parsed.currentIndex)) setCurrentIndex(parsed.currentIndex);
        if (Array.isArray(parsed.answers)) setAnswers(parsed.answers);
      }
    } catch {
      /* ignore corrupt storage */
    }

    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/interview/${sessionId}`);
        if (cancelled) return;
        const session = data.data;
        setSessionData(session);
        setStatus(session.status || 'active');
        setCurrentIndex((idx) => Math.min(idx, Math.max(0, (session.questions?.length || 1) - 1)));
      } catch (err) {
        if (!cancelled) {
          toast.error(err.response?.data?.message || 'Failed to load session');
          setStatus('error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // --- Persist progress on every change (after first hydration) ---
  useEffect(() => {
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ currentIndex, answers }));
    } catch {
      /* storage full / unavailable */
    }
  }, [currentIndex, answers, storageKey]);

  // --- Reset the countdown when the question changes ---
  useEffect(() => {
    if (!currentQuestion) return;
    setQuestionTimer(currentQuestion.timeRecommended || DEFAULT_QUESTION_TIME);
  }, [currentIndex, currentQuestion]);

  // --- Per-question countdown (stops once the question is answered) ---
  useEffect(() => {
    if (status !== 'active') return undefined;
    if (answers[currentIndex]) return undefined; // already answered -> clear

    const interval = setInterval(() => {
      setQuestionTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, answers, status]);

  // --- Session stopwatch (counts up while active) ---
  useEffect(() => {
    if (status !== 'active') return undefined;
    const interval = setInterval(() => setSessionElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // --- Submit + score an answer ---
  const submitAnswer = useCallback(
    async (text, timeSpent) => {
      if (submitting) return null;
      setSubmitting(true);
      try {
        const { data } = await api.put(`/interview/${sessionId}/answer`, {
          questionIndex: currentIndex,
          userAnswer: text,
          timeSpent,
        });
        const result = { userAnswer: text, ...data.data };
        setAnswers((prev) => {
          const next = [...prev];
          next[currentIndex] = result;
          return next;
        });
        return result;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to submit answer');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, currentIndex, submitting]
  );

  const nextQuestion = useCallback(() => {
    setCurrentIndex((idx) => Math.min(idx + 1, Math.max(0, totalQuestions - 1)));
  }, [totalQuestions]);

  const endSession = useCallback(async () => {
    if (ending) return;
    setEnding(true);
    try {
      await api.post(`/interview/${sessionId}/complete`);
      sessionStorage.removeItem(storageKey);
      setStatus('completed');
      navigate(`/results/${sessionId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to finish interview');
    } finally {
      setEnding(false);
    }
  }, [ending, sessionId, storageKey, navigate]);

  return {
    loading,
    sessionData,
    status,
    currentIndex,
    currentQuestion,
    totalQuestions,
    answers,
    currentAnswer: answers[currentIndex] || null,
    questionTimer,
    sessionElapsed,
    elapsedFormatted: formatMMSS(sessionElapsed),
    answeredCount,
    avgScore,
    submitting,
    ending,
    submitAnswer,
    nextQuestion,
    endSession,
    isLastQuestion: currentIndex >= totalQuestions - 1,
  };
};

export default useInterview;
