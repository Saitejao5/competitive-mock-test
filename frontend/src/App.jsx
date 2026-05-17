import React, { useEffect } from 'react';
import { useExamStore } from './store/examStore';
import { useAuthStore } from './store/authStore';
import { useWebSocket } from './hooks/useWebSocket';
import LandingPage from './components/landing/LandingPage';
import BoardExplorerPage from './components/board/BoardExplorerPage';
import ExamConfigPage from './components/exam/ExamConfigPage';
import TierSelectPage from './components/tier/TierSelectPage';
import PracticeModeSelectPage from './components/practice/PracticeModeSelectPage';
import ExamPage from './components/exam/ExamPage';
import AnalysisPage from './components/analysis/AnalysisPage';
import SearchPage from './components/search/SearchPage';
import { ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from './components/auth/AuthPages';
import { DashboardPage, ProfilePage, SavedJobsPage } from './components/user/UserPages';
import './styles/globals.css';

export default function App() {
  const page = useExamStore(s => s.page);
  const setPage = useExamStore(s => s.setPage);
  const searchQuery = useExamStore(s => s.searchQuery);
  const hydrate = useAuthStore(s => s.hydrate);
  const ws = useWebSocket();

  useEffect(() => {
    hydrate();
    if (window.location.pathname === '/reset-password') setPage('reset-password');
  }, [hydrate, setPage]);

  return (
    <div className="noise min-h-screen flex flex-col bg-ink-950">
      {searchQuery && <SearchPage ws={ws} />}
      {!searchQuery && (
        <>
          {page === 'landing' && <LandingPage ws={ws} />}
          {page === 'board-explorer' && <BoardExplorerPage ws={ws} />}
          {page === 'exam-config' && <ExamConfigPage ws={ws} />}
          {page === 'tier-select' && <TierSelectPage ws={ws} />}
          {page === 'practice-mode' && <PracticeModeSelectPage ws={ws} />}
          {page === 'exam' && <ExamPage ws={ws} />}
          {page === 'analytics' && <AnalysisPage />}
          {page === 'login' && <LoginPage />}
          {page === 'signup' && <SignupPage />}
          {page === 'forgot-password' && <ForgotPasswordPage />}
          {page === 'reset-password' && <ResetPasswordPage />}
          {page === 'dashboard' && <DashboardPage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'saved-jobs' && <SavedJobsPage />}
        </>
      )}
    </div>
  );
}
