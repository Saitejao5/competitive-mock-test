import React, { useMemo, useState } from 'react';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useExamStore } from '../../store/examStore';
import AuthNav from './AuthNav';

function AuthShell({ title, subtitle, children }) {
  const { setPage } = useExamStore();
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 px-4 py-4 glass md:px-8">
        <button onClick={() => setPage('landing')} className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-violet-soft font-bold text-white">A</span>
          <span className="font-display text-lg font-bold">AI Exam Platform</span>
        </button>
        <AuthNav />
      </nav>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-8 px-4 py-10 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <section className="hidden md:block">
          <p className="eyebrow mb-4">Government Jobs Portal</p>
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight">
            Secure preparation workspace for every exam path.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-white/45">
            Keep practice history, saved jobs, profile data, and dashboard insights tied to a protected candidate account.
          </p>
        </section>
        <section className="glass rounded-2xl p-5 md:p-8">
          <h2 className="font-display text-3xl font-bold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/70">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-white/10 bg-ink-900/70 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-violet/50"
      />
    </label>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return <div className="rounded-xl border border-flame/30 bg-flame-dim px-4 py-3 text-sm text-flame">{message}</div>;
}

export function LoginPage() {
  const { login, authError, status } = useAuthStore();
  const { setPage } = useExamStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(form);
      setPage('dashboard');
    } catch (err) {
      // Auth store displays the API error.
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your saved jobs, dashboard, and exam profile.">
      <form onSubmit={submit} className="space-y-5">
        <FormError message={authError} />
        <Field label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
        <div className="flex items-center justify-between gap-4 text-sm">
          <button type="button" onClick={() => setPage('forgot-password')} className="text-violet-soft hover:text-white">Forgot Password?</button>
          <button type="button" onClick={() => setPage('signup')} className="text-white/45 hover:text-white">Create account</button>
        </div>
        <button disabled={status === 'loading'} className="btn-primary w-full py-3 disabled:opacity-60">{status === 'loading' ? 'Signing in...' : 'Login'}</button>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const { signup, authError, status } = useAuthStore();
  const { setPage } = useExamStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });

  const submit = async (e) => {
    e.preventDefault();
    try {
      await signup(form);
      setPage('dashboard');
    } catch (err) {
      // Auth store displays the API error.
    }
  };

  return (
    <AuthShell title="Create account" subtitle="Use a strong password. Your password is hashed before it is stored.">
      <form onSubmit={submit} className="space-y-5">
        <FormError message={authError} />
        <Field label="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} autoComplete="username" required />
        <Field label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
        <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" required />
        <button disabled={status === 'loading'} className="btn-primary w-full py-3 disabled:opacity-60">{status === 'loading' ? 'Creating...' : 'Create Account'}</button>
        <button type="button" onClick={() => setPage('login')} className="w-full text-sm text-white/45 hover:text-white">Already have an account? Login</button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { setPage } = useExamStore();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.forgotPassword({ email });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Enter your account email and we will send a short-lived reset link.">
      <form onSubmit={submit} className="space-y-5">
        <FormError message={error} />
        {message && <div className="rounded-xl border border-emerald-exam/30 bg-emerald-dim px-4 py-3 text-sm text-emerald-exam">{message}</div>}
        <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <button disabled={loading} className="btn-primary w-full py-3 disabled:opacity-60">{loading ? 'Sending...' : 'Send reset link'}</button>
        <button type="button" onClick={() => setPage('login')} className="w-full text-sm text-white/45 hover:text-white">Back to login</button>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { setPage } = useExamStore();
  const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.resetPassword({ token, ...form });
      setMessage(data.message);
      window.history.replaceState({}, '', '/');
      setTimeout(() => setPage('login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose new password" subtitle="Reset links expire quickly and can only be used once.">
      <form onSubmit={submit} className="space-y-5">
        <FormError message={error || (!token ? 'Reset token is missing from the link.' : '')} />
        {message && <div className="rounded-xl border border-emerald-exam/30 bg-emerald-dim px-4 py-3 text-sm text-emerald-exam">{message}</div>}
        <Field label="New Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" required />
        <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} autoComplete="new-password" required />
        <button disabled={loading || !token} className="btn-primary w-full py-3 disabled:opacity-60">{loading ? 'Updating...' : 'Reset password'}</button>
      </form>
    </AuthShell>
  );
}
