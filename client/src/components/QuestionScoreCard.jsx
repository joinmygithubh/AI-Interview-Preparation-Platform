import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';

const CIRCUMFERENCE = 251; // 2 * pi * 40

/** Color the ring/score by band: <50 red, <75 amber, >=75 green. */
const scoreColor = (score) => {
  if (score >= 75) return { stroke: '#22c55e', text: 'text-green-500' };
  if (score >= 50) return { stroke: '#f59e0b', text: 'text-amber-500' };
  return { stroke: '#ef4444', text: 'text-red-500' };
};

const TABS = [
  { key: 'feedback', label: 'Feedback' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'improvements', label: 'Improvements' },
];

const ScoreRing = ({ score }) => {
  const { stroke, text } = scoreColor(score);
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          strokeWidth="8"
          stroke={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${text}`}>{score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
};

const ListContent = ({ items, emptyLabel, dotClass }) =>
  items && items.length ? (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-slate-400">{emptyLabel}</p>
  );

/**
 * Displays the AI evaluation of a single answer: score ring, tabbed
 * feedback/strengths/improvements, and a collapsible example answer.
 */
const QuestionScoreCard = ({ result }) => {
  const [activeTab, setActiveTab] = useState('feedback');
  const [showExample, setShowExample] = useState(false);

  if (!result) return null;

  const score = typeof result.aiScore === 'number' ? result.aiScore : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />
        <div>
          <h4 className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your score
          </h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {score >= 75
              ? 'Strong answer'
              : score >= 50
              ? 'Decent answer with room to improve'
              : 'Needs significant improvement'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-4 min-h-[60px]">
        {activeTab === 'feedback' && (
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {result.aiFeedback || 'No feedback provided.'}
          </p>
        )}
        {activeTab === 'strengths' && (
          <ListContent
            items={result.strengths}
            emptyLabel="No specific strengths noted."
            dotClass="bg-green-500"
          />
        )}
        {activeTab === 'improvements' && (
          <ListContent
            items={result.improvements}
            emptyLabel="No improvements noted."
            dotClass="bg-amber-500"
          />
        )}
      </div>

      {/* Collapsible example answer */}
      {result.exampleAnswer && (
        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            type="button"
            onClick={() => setShowExample((v) => !v)}
            className="flex w-full items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400"
          >
            {showExample ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Show example answer
          </button>
          <AnimatePresence initial={false}>
            {showExample && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {result.exampleAnswer}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default QuestionScoreCard;
