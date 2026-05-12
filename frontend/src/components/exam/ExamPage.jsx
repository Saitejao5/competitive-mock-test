import React, { useEffect, useCallback } from 'react';
import { useExamStore } from '../../store/examStore';
import { useTimer } from '../../hooks/useTimer';
import ExamSidebar from './ExamSidebar';
import SectionView from './SectionView';
import ConsolePanel from '../ui/ConsolePanel';

export default function ExamPage({ ws }) {
  const {
    config, sections, currentSectionIndex, setPage,
    answers, timings, sessionId, stopExamTimer, saveCurrentTiming
  } = useExamStore();

  const totalSeconds = config.sections.length * 15 * 60;
  const timer = useTimer(totalSeconds, handleTimeExpired);

  useEffect(() => {
    timer.start();
  }, []);

  function handleTimeExpired() {
    useExamStore.getState().addLog('⏰ Time expired — auto-submitting', 'warn');
    handleSubmit(true);
  }

  const handleSubmit = useCallback((auto = false) => {
    if (!auto) {
      const total = sections.reduce((s, sec) => s + sec.questions.length, 0);
      const answered = Object.keys(answers).length;
      const unanswered = total - answered;
      if (unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    }
    stopExamTimer();
    timer.stop();
    ws.submitExam(sessionId, answers, timings);
    setPage('analysis');
  }, [answers, timings, sessionId, sections]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* TOP NAV */}
      <header className="glass border-b border-white/5 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-dim border border-violet/30 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse-soft" />
          </div>
          <span className="font-display font-bold text-base tracking-tight">{config.exam}</span>
          <span className="tag">{config.difficulty}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-sm font-medium ${
            timer.isCritical ? 'border-flame/50 text-flame bg-flame-dim' :
            timer.isWarning ? 'border-gold/50 text-gold bg-gold-dim' :
            'border-white/10 text-white/70'
          }`}>
            <svg className={`w-3.5 h-3.5 ${timer.isCritical ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {timer.formatted}
          </div>

          <button
            onClick={() => handleSubmit(false)}
            className="px-5 py-2 rounded-xl font-display font-semibold text-sm text-white transition-all duration-200"
            style={{ background: 'linear-gradient(135deg, #2dd98a, #20b570)' }}
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 min-h-0">
        <ExamSidebar onSubmit={() => handleSubmit(false)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8">
            <SectionView />

            {/* Console at bottom */}
            <div className="mt-8">
              <ConsolePanel maxHeight="140px" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
