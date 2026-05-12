import React from 'react';
import { useExamStore } from './store/examStore';
import { useWebSocket } from './hooks/useWebSocket';
import LandingPage from './components/landing/LandingPage';
import BoardExplorerPage from './components/board/BoardExplorerPage';
import ExamConfigPage from './components/exam/ExamConfigPage';
import TierSelectPage from './components/tier/TierSelectPage';
import PracticeModeSelectPage from './components/practice/PracticeModeSelectPage';
import ExamPage from './components/exam/ExamPage';
import AnalysisPage from './components/analysis/AnalysisPage';
import SearchPage from './components/search/SearchPage';
import './styles/globals.css';

export default function App() {
  const page = useExamStore(s => s.page);
  const searchQuery = useExamStore(s => s.searchQuery);
  const ws = useWebSocket();

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
        </>
      )}
    </div>
  );
}
