import React, { useEffect, useState } from 'react';
import { userApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useExamStore } from '../../store/examStore';
import AuthNav from '../auth/AuthNav';

function UserShell({ title, subtitle, children }) {
  const { setPage } = useExamStore();
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 px-4 py-4 glass md:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setPage('landing')} className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white">Back</button>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-violet-soft font-bold text-white">A</span>
          <span className="font-display text-lg font-bold">AI Exam Platform</span>
        </div>
        <AuthNav />
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:px-8">
        <div className="mb-8">
          <p className="eyebrow mb-3">Candidate Area</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-white/45">{subtitle}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

function ProtectedGate({ children }) {
  const { status, user, hydrate } = useAuthStore();
  const { setPage } = useExamStore();

  useEffect(() => { hydrate(); }, [hydrate]);

  if (status === 'loading' || status === 'idle') {
    return (
      <UserShell title="Checking session" subtitle="Restoring your secure session.">
        <div className="glass rounded-2xl p-8 text-white/50">Loading...</div>
      </UserShell>
    );
  }

  if (!user) {
    return (
      <UserShell title="Login required" subtitle="This area is protected. Sign in to continue.">
        <div className="glass rounded-2xl p-6">
          <button onClick={() => setPage('login')} className="btn-primary">Go to login</button>
        </div>
      </UserShell>
    );
  }

  return children;
}

function useProtectedData(loader) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let active = true;
    loader()
      .then(data => active && setState({ loading: false, error: '', data }))
      .catch(err => active && setState({ loading: false, error: err.message, data: null }));
    return () => { active = false; };
  }, [loader]);

  return state;
}

export function DashboardPage() {
  const state = useProtectedData(userApi.dashboard);
  const { setPage } = useExamStore();

  return (
    <ProtectedGate>
      <UserShell title="Dashboard" subtitle="A secure snapshot of your preparation account and saved activity.">
        {state.error && <div className="mb-5 rounded-xl border border-flame/30 bg-flame-dim px-4 py-3 text-flame">{state.error}</div>}
        <div className="grid gap-4 md:grid-cols-4">
          {['savedJobs', 'completedSections', 'seenQuestions', 'seenBatches'].map((key) => (
            <div key={key} className="metric-card">
              <p className="text-xs uppercase tracking-widest text-white/35">{key.replace(/([A-Z])/g, ' $1')}</p>
              <p className="mt-3 font-display text-3xl font-bold text-violet-soft">{state.loading ? '-' : state.data?.stats?.[key] ?? 0}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <button onClick={() => setPage('profile')} className="search-result-card">Profile</button>
          <button onClick={() => setPage('saved-jobs')} className="search-result-card">Saved jobs</button>
          <button onClick={() => setPage('board-explorer')} className="search-result-card">Continue practice</button>
        </div>
      </UserShell>
    </ProtectedGate>
  );
}

export function ProfilePage() {
  const state = useProtectedData(userApi.profile);

  return (
    <ProtectedGate>
      <UserShell title="Profile" subtitle="Your account details are loaded from the authenticated API session.">
        <div className="glass grid gap-5 rounded-2xl p-6 md:grid-cols-2">
          <div>
            <p className="text-sm text-white/35">Username</p>
            <p className="mt-2 text-lg font-semibold">{state.loading ? 'Loading...' : state.data?.user?.username}</p>
          </div>
          <div>
            <p className="text-sm text-white/35">Email</p>
            <p className="mt-2 text-lg font-semibold">{state.loading ? 'Loading...' : state.data?.user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-white/35">Member since</p>
            <p className="mt-2 text-lg font-semibold">
              {state.loading ? 'Loading...' : new Date(state.data?.user?.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </UserShell>
    </ProtectedGate>
  );
}

export function SavedJobsPage() {
  const state = useProtectedData(userApi.savedJobs);
  const jobs = state.data?.savedJobs || [];

  return (
    <ProtectedGate>
      <UserShell title="Saved jobs" subtitle="Authenticated candidates can keep job opportunities attached to their profile.">
        <div className="grid gap-3">
          {state.loading && <div className="glass rounded-2xl p-6 text-white/45">Loading saved jobs...</div>}
          {!state.loading && jobs.length === 0 && (
            <div className="glass rounded-2xl p-6 text-white/45">No saved jobs yet. Saved vacancies will appear here.</div>
          )}
          {jobs.map(job => (
            <div key={job.jobId} className="review-item">
              <p className="font-semibold">{job.title || job.jobId}</p>
              <p className="mt-1 text-sm text-white/40">{job.department || 'Government recruitment'}</p>
            </div>
          ))}
        </div>
      </UserShell>
    </ProtectedGate>
  );
}

