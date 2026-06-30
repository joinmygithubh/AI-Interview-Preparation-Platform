import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Flame,
  ListChecks,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageWrapper from '../components/layout/PageWrapper';
import api from '../services/api';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
const fmtLongDate = (d) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const DIFFICULTY_BADGE = {
  easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_PILL = {
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

const scoreBadge = (s) => {
  if (s == null) return 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300';
  if (s >= 75) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
  if (s >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
};

const RADAR_KEYS = [
  ['technical', 'Technical'],
  ['communication', 'Communication'],
  ['problemSolving', 'Problem Solving'],
  ['behavioral', 'Behavioral'],
  ['domainKnowledge', 'Domain Knowledge'],
];

const StatCard = ({ icon: Icon, label, value, extra }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      {Icon && <Icon className="h-4 w-4 text-slate-400" />}
    </div>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
      {extra}
    </div>
  </div>
);

const LineTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs shadow">
      <div className="font-medium text-slate-700 dark:text-slate-200">{p.fullDate}</div>
      <div className="text-slate-500 dark:text-slate-400">{p.jobRole}</div>
      <div className="text-indigo-600 dark:text-indigo-400">Score: {p.score}</div>
    </div>
  );
};

const EmptyChart = () => (
  <div className="flex h-64 items-center justify-center text-slate-400">
    No sessions yet
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/user/dashboard'),
      api.get('/interview/history', { params: { page: 1, limit: 10 } }),
    ])
      .then(([dash, hist]) => {
        if (!active) return;
        setStats(dash.data.data);
        setSessions(hist.data.data.sessions || []);
      })
      .catch(() => active && toast.error('Failed to load dashboard'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const lineData = useMemo(
    () =>
      (stats?.last10Sessions || []).map((s) => ({
        date: fmtDate(s.date),
        fullDate: fmtLongDate(s.date),
        score: s.overallScore ?? 0,
        jobRole: s.jobRole || '',
      })),
    [stats]
  );

  // Average skillsAnalysis across completed sessions that have it.
  const radarData = useMemo(() => {
    const withSkills = sessions
      .map((s) => s.aiSummary?.skillsAnalysis)
      .filter(Boolean);
    if (!withSkills.length) return [];
    return RADAR_KEYS.map(([key, subject]) => {
      const avg =
        withSkills.reduce((sum, sa) => sum + (Number(sa[key]) || 0), 0) /
        withSkills.length;
      return { subject, value: Math.round(avg) };
    });
  }, [sessions]);

  const trend = useMemo(() => {
    const scored = (stats?.last10Sessions || []).filter(
      (s) => typeof s.overallScore === 'number'
    );
    if (scored.length < 2) return 0;
    return scored[scored.length - 1].overallScore - scored[scored.length - 2].overallScore;
  }, [stats]);

  const handleDelete = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await api.delete(`/interview/${id}`);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      toast.success('Session deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <PageWrapper>
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        Dashboard
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={ListChecks} label="Total Sessions" value={stats?.totalSessions ?? 0} />
        <StatCard
          icon={trend < 0 ? TrendingDown : TrendingUp}
          label="Avg Score"
          value={stats?.avgScore ?? 0}
          extra={
            trend !== 0 && (
              <span
                className={`flex items-center text-xs font-medium ${
                  trend > 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {trend > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {Math.abs(trend)}
              </span>
            )
          }
        />
        <StatCard icon={Trophy} label="Best Score" value={stats?.bestScore ?? 0} />
        <StatCard icon={Flame} label="Streak" value={`${stats?.streak ?? 0} days`} />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
            Score trend
          </h3>
          {lineData.length ? (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip content={<LineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
            Skills analysis
          </h3>
          {radarData.length ? (
            <ResponsiveContainer width="100%" height={256}>
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-slate-200 dark:stroke-slate-700" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  dataKey="value"
                  stroke="#6366f1"
                  fill="#c7d2fe"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </div>
      </div>

      {/* Recent sessions table */}
      <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">
          Recent sessions
        </h3>

        {sessions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Difficulty</th>
                  <th className="py-2 pr-4 font-medium">Score</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr
                    key={s._id}
                    className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <td className="py-3 pr-4 whitespace-nowrap">{fmtLongDate(s.createdAt)}</td>
                    <td className="py-3 pr-4">{s.jobRole}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_BADGE[s.difficulty] || ''}`}>
                        {s.difficulty}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreBadge(s.overallScore)}`}>
                        {s.overallScore ?? '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_PILL[s.status] || ''}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/results/${s._id}`}
                          className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          Results
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(s._id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !loading && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <svg width="64" height="64" viewBox="0 0 64 64" className="text-slate-300 dark:text-slate-600">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
                <circle cx="23" cy="26" r="3" fill="currentColor" />
                <circle cx="41" cy="26" r="3" fill="currentColor" />
                <path d="M22 42 Q32 34 42 42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="text-slate-500 dark:text-slate-400">No interviews yet</p>
              <Link
                to="/upload"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Start your first interview
              </Link>
            </div>
          )
        )}
      </div>
    </PageWrapper>
  );
};

export default Dashboard;
