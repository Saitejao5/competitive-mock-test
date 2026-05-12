import React from 'react';
import { useExamStore } from '../../store/examStore';

const STATUS_STYLES = {
  pending:    { dot: 'bg-white/10', label: '—', badge: 'text-white/20' },
  generating: { dot: 'bg-gold animate-pulse', label: '⋯', badge: 'text-gold' },
  ready:      { dot: 'bg-emerald-exam', label: '✓', badge: 'text-emerald-exam' },
  error:      { dot: 'bg-flame', label: '✗', badge: 'text-flame' }
};

export default function ExamSidebar() {
  const { sections, currentSectionIndex, currentQIndex, answers, setCurrentSection, setCurrentQ } = useExamStore();

  const totalQ = sections.reduce((s, sec) => s + sec.questions.length, 0);
  const answered = Object.keys(answers).length;
  const progress = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;

  const currentSec = sections[currentSectionIndex];

  return (
    <aside className="w-64 glass border-r border-white/5 flex flex-col sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto shrink-0">
      <div className="p-4 flex flex-col gap-4 flex-1">

        {/* Progress */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-white/30 uppercase tracking-widest">Progress</span>
            <span className="text-xs font-mono text-violet-soft">{answered}/{totalQ}</span>
          </div>
          <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c5cfc, #2dd98a)' }}
            />
          </div>
          <div className="text-right text-xs font-mono text-white/20 mt-1">{progress}%</div>
        </div>

        {/* Sections */}
        <div>
          <p className="text-xs font-mono text-white/20 uppercase tracking-widest mb-2 px-1">Sections</p>
          <div className="flex flex-col gap-1.5">
            {sections.map((sec, i) => {
              const st = STATUS_STYLES[sec.status] || STATUS_STYLES.pending;
              const isActive = i === currentSectionIndex;
              const secAnswered = sec.questions.filter((_, qi) => answers[`${i}_${qi}`]).length;
              return (
                <button
                  key={sec.name}
                  onClick={() => sec.status === 'ready' && setCurrentSection(i)}
                  disabled={sec.status !== 'ready'}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-body text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-violet-dim border border-violet/40 text-violet-soft'
                      : sec.status === 'ready'
                        ? 'border border-white/5 text-white/50 hover:border-white/15 hover:text-white/80 cursor-pointer'
                        : 'border border-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <span className="truncate text-xs">{sec.name}</span>
                  </div>
                  <span className={`text-xs font-mono shrink-0 ${st.badge}`}>
                    {sec.status === 'ready' ? `${secAnswered}/${sec.questions.length}` : st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question dots */}
        {currentSec?.status === 'ready' && currentSec.questions.length > 0 && (
          <div>
            <p className="text-xs font-mono text-white/20 uppercase tracking-widest mb-2 px-1">
              {currentSec.name.split(' ')[0]} — Q Map
            </p>
            <div className="flex flex-wrap gap-1.5">
              {currentSec.questions.map((_, qi) => {
                const key = `${currentSectionIndex}_${qi}`;
                const done = answers[key];
                const cur = qi === currentQIndex;
                return (
                  <button
                    key={qi}
                    onClick={() => setCurrentQ(qi)}
                    title={`Q${qi + 1}`}
                    className={`w-7 h-7 rounded-md text-[10px] font-mono transition-all duration-100 border ${
                      cur
                        ? 'border-sky-exam/70 text-sky-exam bg-sky-exam/10'
                        : done
                          ? 'border-violet/50 text-violet-soft bg-violet-dim'
                          : 'border-white/8 text-white/25 hover:border-white/20'
                    }`}
                  >
                    {qi + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
