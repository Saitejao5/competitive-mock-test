import React, { useCallback, useEffect } from 'react';
import { useExamStore } from '../../store/examStore';
import { useTimer } from '../../hooks/useTimer';
import SectionView from './SectionView';

const STATUS_STYLES = {
  pending: 'border-white/10 text-white/30',
  generating: 'border-gold/40 bg-gold-dim/20 text-gold',
  ready: 'border-white/12 text-white/60',
  error: 'border-flame/40 bg-flame-dim/20 text-flame'
};

export default function ExamPage({ ws }) {
  const {
    config,
    sections,
    currentSectionIndex,
    answers,
    timings,
    sessionId,
    stopExamTimer,
    saveCurrentTiming,
    setCurrentSection,
    setCurrentQ,
    setPage,
    addLog
  } = useExamStore();

  const totalSeconds = Math.max(1, config.sections.length) * 15 * 60;
  const timer = useTimer(totalSeconds, handleTimeExpired);

  useEffect(() => {
    timer.start();
  }, []);

  function handleTimeExpired() {
    addLog('Time expired. Auto-submitting exam.', 'warn');
    handleSubmit(true);
  }

  const handleSubmit = useCallback((auto = false) => {
    if (!auto) {
      const total = sections.reduce((sum, sec) => sum + sec.questions.length, 0);
      const unanswered = total - Object.keys(answers).length;
      if (unanswered > 0 && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    }

    stopExamTimer();
    timer.stop();
    ws.submitExam(sessionId, answers, timings);
    setPage('analytics');
  }, [answers, timings, sessionId, sections, stopExamTimer, timer, setPage, ws]);

  const currentSection = sections[currentSectionIndex];
  const totalQuestions = sections.reduce((sum, sec) => sum + sec.questions.length, 0);
  const totalAnswered = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  return (
    <div className="focus-shell min-h-screen">
      <header className="exam-topbar">
        <div className="min-w-0">
          <p className="eyebrow mb-1">Focus mode</p>
          <h1 className="truncate font-display text-lg font-bold">{config.exam} - {currentSection?.name || 'Preparing section'}</h1>
        </div>

        <div className="hidden min-w-[220px] md:block">
          <div className="mb-1 flex justify-between text-xs text-white/45">
            <span>Progress</span>
            <span>{totalAnswered}/{totalQuestions}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-violet via-sky-exam to-emerald-exam transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`timer-pill ${timer.isCritical ? 'timer-critical' : timer.isWarning ? 'timer-warning' : ''}`}>
            {timer.formatted}
          </div>
          <button type="button" onClick={() => handleSubmit(false)} className="submit-pill">
            Submit
          </button>
        </div>
      </header>

      <main className="grid min-h-[calc(100vh-76px)] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[1fr_280px] lg:px-8">
        <section className="min-w-0">
          <SectionView />
        </section>

        <aside className="question-map-panel">
          <div className="mb-5">
            <p className="eyebrow mb-2">Question navigator</p>
            <div className="text-sm text-white/45">{progress}% complete</div>
          </div>

          <div className="space-y-5">
            {sections.map((sec, sectionIndex) => {
              const statusClass = STATUS_STYLES[sec.status] || STATUS_STYLES.pending;
              const isActive = sectionIndex === currentSectionIndex;
              const answeredInSection = sec.questions.filter((_, qIndex) => answers[`${sectionIndex}_${qIndex}`]).length;

              return (
                <div key={`${sec.name}-${sectionIndex}`} className={`rounded-xl border p-3 ${isActive ? 'border-violet/50 bg-violet-dim/20' : statusClass}`}>
                  <button
                    type="button"
                    onClick={() => sec.status === 'ready' && setCurrentSection(sectionIndex)}
                    disabled={sec.status !== 'ready'}
                    className="mb-3 flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed"
                  >
                    <span className="truncate text-sm font-semibold text-white/80">{sec.name}</span>
                    <span className="font-mono text-xs text-white/40">
                      {sec.status === 'ready' ? `${answeredInSection}/${sec.questions.length}` : sec.status}
                    </span>
                  </button>

                  {sec.status === 'ready' && (
                    <div className="grid grid-cols-5 gap-1.5">
                      {sec.questions.map((_, qIndex) => {
                        const activeQuestion = isActive && qIndex === useExamStore.getState().currentQIndex;
                        const done = answers[`${sectionIndex}_${qIndex}`];
                        return (
                          <button
                            key={qIndex}
                            type="button"
                            onClick={() => {
                              saveCurrentTiming();
                              setCurrentSection(sectionIndex);
                              setCurrentQ(qIndex);
                            }}
                            className={`q-dot ${activeQuestion ? 'q-dot-active' : done ? 'q-dot-done' : ''}`}
                            title={`${sec.name} question ${qIndex + 1}`}
                          >
                            {qIndex + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}
