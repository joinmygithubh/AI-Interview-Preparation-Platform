import { useEffect, useMemo, useState } from 'react';
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

const ringColor = (s) => (s >= 75 ? '#10B981' : s >= 50 ? '#F59E0B' : '#EF4444');

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
    api
      .get('/interview/history', { params: { page, limit: PAGE_SIZE } })
      .then(({ data: res }) => active && setData(res.data))
      .catch(() => active && toast.error('Failed to load history'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  // Filters + sort are applied to the current page (server paginates by page/limit).
  const visible = useMemo(() => {
    let list = [...(data.sessions || [])];
    if (dateFrom) list = list.filter((s) => new Date(s.createdAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((s) => new Date(s.createdAt) <= new Date(`${dateTo}T23:59:59`));
    if (difficulty) list = list.filter((s) => s.difficulty === difficulty);
    if (minScore !== '') list = list.filter((s) => (s.overallScore ?? 0) >= Number(minScore));

    list.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest':
          return (b.overallScore ?? 0) - (a.overallScore ?? 0);
        case 'lowest':
          return (a.overallScore ?? 0) - (b.overallScore ?? 0);
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    return list;
  }, [data.sessions, dateFrom, dateTo, difficulty, minScore, sort]);

  const inputClass =
    'rounded-lg border border-slate-300 dark:border-slate-700 bg-surface-light dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500';

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">History</h1>
        <div className="flex gap-1 rounded-lg border border-slate-300 dark:border-slate-700 p-1">
          <button
            type="button"
            onClick={() => setView('card')}
            className={`rounded-md p-1.5 ${view === 'card' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={`rounded-md p-1.5 ${view === 'table' ? 'bg-brand-600 text-white' : 'text-slate-500'}`}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-surface-light dark:bg-slate-800/60 p-4">
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Difficulty
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
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
            onChange={(e) => setMinScore(e.target.value)}
            placeholder="0"
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="ml-auto flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest score</option>
            <option value="lowest">Lowest score</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : !visible.length ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <svg width="64" height="64" viewBox="0 0 64 64" className="text-brand-500">
            <circle cx="28" cy="28" r="18" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <line x1="41" y1="41" x2="54" y2="54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="28" x2="34" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">No sessions match your filters.</p>
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <div
              key={s._id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-surface-light dark:bg-slate-800/60 p-5"
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
                className="mt-auto rounded-lg bg-brand-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-brand-700"
              >
                View results
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-surface-light dark:bg-slate-800/60">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Role</th>
                <th className="p-4 font-medium">Difficulty</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
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
                    <Link to={`/results/${s._id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
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
