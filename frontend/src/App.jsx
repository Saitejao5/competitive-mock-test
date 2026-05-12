import React from 'react';
import { useExamStore } from './store/examStore';
import { useWebSocket } from './hooks/useWebSocket';
import HomePage from './components/home/HomePage';
import ExamPage from './components/exam/ExamPage';
import AnalysisPage from './components/analysis/AnalysisPage';
import './styles/globals.css';

export default function App() {
  const page = useExamStore(s => s.page);
  const ws = useWebSocket();

  return (
    <div className="noise min-h-screen flex flex-col">
      {page === 'home' && <HomePage ws={ws} />}
      {page === 'exam' && <ExamPage ws={ws} />}
      {page === 'analysis' && <AnalysisPage />}
    </div>
  );
}
