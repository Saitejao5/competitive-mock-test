import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useExamStore } from '../../store/examStore';

export default function AuthNav() {
  const { user, status, logout } = useAuthStore();
  const { setPage } = useExamStore();
  const [open, setOpen] = useState(false);

  const go = (page) => {
    setOpen(false);
    setPage(page);
  };

  if (status === 'loading') return <span className="tag text-xs">Checking session</span>;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => go('login')} className="btn-ghost px-3 py-2 text-sm">Login</button>
        <button onClick={() => go('signup')} className="btn-primary px-3 py-2 text-sm">Signup</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-violet/40"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-dim font-display text-sm font-bold text-violet-soft">
          {(user.username || user.email || 'U').slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold text-white">{user.username || 'Candidate'}</span>
          <span className="block max-w-[12rem] truncate text-xs text-white/40">{user.email}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-ink-900 p-2 shadow-2xl">
          <button onClick={() => go('dashboard')} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5">Dashboard</button>
          <button onClick={() => go('profile')} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5">Profile</button>
          <button onClick={() => go('saved-jobs')} className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5">Saved jobs</button>
          <button
            onClick={async () => { await logout(); go('login'); }}
            className="mt-1 w-full rounded-lg border-t border-white/5 px-3 py-2 text-left text-sm text-flame hover:bg-flame-dim"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

