import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="mb-6 flex items-center gap-2">
          <Brain className="h-6 w-6 text-indigo-600" />
          <span className="text-lg font-bold text-slate-900 dark:text-white">InterviewAI</span>
        </div>
        <h1 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Create account</h1>

        <input
          name="name"
          required
          value={form.name}
          onChange={onChange}
          placeholder="Full name"
          className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <input
          name="email"
          type="email"
          required
          value={form.email}
          onChange={onChange}
          placeholder="Email"
          className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          value={form.password}
          onChange={onChange}
          placeholder="Password (min 6 chars)"
          className="mb-5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </button>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
