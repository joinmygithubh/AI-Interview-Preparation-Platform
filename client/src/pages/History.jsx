import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, List, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageWrapper from '../components/layout/PageWrapper';
import api from '../services/api';

const PAGE_SIZE = 9;
const CIRC = 126; // 2 * pi * 20

const DIFFICULTY_BADGE = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const ringColor = (s) => (s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444');

const SmallRing = ({ score = 0 }) => {
  const offset = CIRC * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = ringColor(score);
  return (
    <div className="relative h-[50px] w-[50px]">
      <svg className="h-[50px] w-[50px] -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" stroke={color} strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score}
      </div>
    </div>
  );
};

const History = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ sessions: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('card');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [minScore, setMinScore] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { page, limit: PAGE_SIZE, sort };
    if (difficulty) params.difficulty = difficulty;
    if (minScore !== '') params.minScore = minScore;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    api
      .get('/interview/history', { params })
      .then(({ data: res }) => active && setData(res.data))
      .catch(() => active && toast.error('Failed to load history'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, difficulty, minScore, dateFrom, dateTo, sort]);

  // Reset to page 1 whenever a filter/sort changes.
  const onFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const sessions = data.sessions || [];

  const inputClass =
    'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History</h1>
        <div className="flex gap-1 rounded-lg border border-slate-300 dark:border-slate-700 p-1">
          <button
            type="button"
            onClick={() => setView('card')}
            className={`rounded-md p-1.5 ${view === 'card' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`rounded-md p-1.5 ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          From
          <input type="date" value={dateFrom} onChange={(e) => onFilter(setDateFrom)(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          To
          <input type="date" value={dateTo} onChange={(e) => onFilter(setDateTo)(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Difficulty
          <select value={difficulty} onChange={(e) => onFilter(setDifficulty)(e.target.value)} className={inputClass}>
            <option value="">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Min score
          <input
            type="number"
            min="0"
            max="100"
            value={minScore}
            onChange={(e) => onFilter(setMinScore)(e.target.value)}
            placeholder="0"
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="ml-auto flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Sort
          <select value={sort} onChange={(e) => onFilter(setSort)(e.target.value)} className={inputClass}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest score</option>
            <option value="lowest">Lowest score</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : !sessions.length ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          No sessions match your filters.
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <div
              key={s._id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{s.jobRole}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(s.createdAt)}</p>
                </div>
                <SmallRing score={s.overallScore ?? 0} />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded-full px-2.5 py-0.5 font-medium capitalize ${DIFFICULTY_BADGE[s.difficulty] || ''}`}>
                  {s.difficulty}
                </span>
                {typeof s.duration === 'number' && (
                  <span className="text-slate-500 dark:text-slate-400">{s.duration} min</span>
                )}
              </div>
              <Link
                to={`/results/${s._id}`}
                className="mt-auto rounded-lg bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
              >
                View results
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Difficulty</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200">
                  <td className="p-4 whitespace-nowrap">{fmtDate(s.createdAt)}</td>
                  <td className="p-4">{s.jobRole}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_BADGE[s.difficulty] || ''}`}>
                      {s.difficulty}
                    </span>
                  </td>
                  <td className="p-4 font-semibold" style={{ color: ringColor(s.overallScore ?? 0) }}>
                    {s.overallScore ?? '—'}
                  </td>
                  <td className="p-4">{typeof s.duration === 'number' ? `${s.duration} min` : '—'}</td>
                  <td className="p-4">
                    <Link to={`/results/${s._id}`} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                      View results
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Page {data.page} of {data.pages || 1}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(data.pages || 1, p + 1))}
          disabled={page >= (data.pages || 1)}
          className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </PageWrapper>
  );
};

export default History;
