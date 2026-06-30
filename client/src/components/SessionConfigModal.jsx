import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';

const ROLE_SUGGESTIONS = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Data Scientist',
  'DevOps Engineer',
  'Product Manager',
  'Mobile Engineer',
  'Machine Learning Engineer',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Modal for configuring an interview session before generating questions.
 */
const SessionConfigModal = ({ isOpen, onClose, resumeId }) => {
  const navigate = useNavigate();
  const [jobRole, setJobRole] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const handleGenerate = async () => {
    if (!jobRole.trim()) {
      toast.error('Please enter a job role');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post('/interview/start', {
        resumeId,
        jobRole: jobRole.trim(),
        difficulty,
        questionCount: count,
      });

      const sessionId = data?.data?._id || data?.data?.session?._id;
      toast.success('Questions generated!');
      onClose?.();
      navigate(`/interview/${sessionId}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to generate questions'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Configure Interview
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Job role */}
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Job role
            </label>
            <input
              list="role-suggestions"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
              className="mb-4 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <datalist id="role-suggestions">
              {ROLE_SUGGESTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            {/* Difficulty pills */}
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Difficulty
            </label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    difficulty === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Question count */}
            <div className="mb-6">
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Number of questions
                </label>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {count}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={15}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Generating...' : 'Generate questions'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SessionConfigModal;
