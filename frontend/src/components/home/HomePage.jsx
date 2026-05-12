import React, { useState } from 'react';
import { useExamStore } from '../../store/examStore';
import ConsolePanel from '../ui/ConsolePanel';

const EXAMS = ['SSC CGL', 'SSC CHSL', 'UPSC CSE', 'RRB NTPC', 'IBPS PO', 'CAT', 'GATE', 'NDA', 'CMAT', 'SBI PO'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Exam Level'];
const SECTIONS_LIST = ['Reasoning', 'Quantitative Aptitude', 'English Language', 'General Knowledge', 'Computer Awareness', 'Current Affairs'];
const MODES = [
  { id: 'exam', icon: '📋', label: 'Practice by Exam' },
  { id: 'topic', icon: '🎯', label: 'Practice by Topic' },
  { id: 'paper', icon: '📄', label: 'Practice by Paper' }
];

const DIFF_COLORS = {
  'Easy': 'border-emerald-exam/50 text-emerald-exam bg-emerald-dim',
  'Medium': 'border-gold/50 text-gold bg-gold-dim',
  'Hard': 'border-flame/50 text-flame bg-flame-dim',
  'Exam Level': 'border-violet-soft/50 text-violet-soft bg-violet-dim'
};

export default function HomePage({ ws }) {
  const { config, setConfig, wsStatus, addLog } = useExamStore();
  const [launching, setLaunching] = useState(false);

  const toggleSection = (sec) => {
    const sections = config.sections.includes(sec)
      ? config.sections.filter(s => s !== sec)
      : [...config.sections, sec];
    setConfig({ sections });
  };

  const handleStart = () => {
    if (config.sections.length === 0) { alert('Select at least one section.'); return; }
    if (wsStatus !== 'connected') {
      addLog('Backend not connected — start the Node.js server on port 3001', 'error');
      alert('Backend server is not connected. Please start the backend: cd backend && npm run dev');
      return;
    }
    setLaunching(true);
    setTimeout(() => {
      ws.startExam(config);
      setLaunching(false);
    }, 300);
  };

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-dim border border-violet/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-violet animate-pulse-soft" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">AI Exam Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tag">LLM-First</span>
          <span className="tag">Zero-DB</span>
          <span className={`tag ${wsStatus === 'connected' ? 'border-emerald-exam/40 text-emerald-exam bg-emerald-dim' : wsStatus === 'connecting' ? 'border-gold/40 text-gold' : 'border-flame/40 text-flame'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-exam animate-pulse' : wsStatus === 'connecting' ? 'bg-gold animate-pulse' : 'bg-flame'}`} />
            WS: {wsStatus}
          </span>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-12">
        {/* HERO */}
        <div className="mb-12 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet/20 bg-violet-dim text-violet-soft text-xs font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet animate-pulse" />
            Powered by Claude · Real-time Streaming · Multi-provider Fallback
          </div>
          <h1 className="font-display font-bold text-5xl leading-tight tracking-tight mb-4">
            Crack Any{' '}
            <span className="bg-gradient-to-r from-violet to-violet-soft bg-clip-text text-transparent">
              Competitive Exam
            </span>
            <br />with AI
          </h1>
          <p className="text-white/40 font-body text-lg max-w-xl">
            AI-generated questions, zero repetition, section streaming, deep post-exam analytics.
          </p>
        </div>

        <div className="grid gap-5">
          {/* ROW 1: Mode + Exam + Difficulty */}
          <div className="grid grid-cols-3 gap-5">
            {/* Mode */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Practice Mode</p>
              <div className="flex flex-col gap-2">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setConfig({ mode: m.id })}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body font-medium text-left transition-all duration-150 ${
                      config.mode === m.id
                        ? 'bg-violet-dim border border-violet/40 text-violet-soft'
                        : 'border border-white/5 text-white/40 hover:border-white/15 hover:text-white/70'
                    }`}
                  >
                    <span>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Select Exam</p>
              <div className="grid grid-cols-2 gap-1.5">
                {EXAMS.map(e => (
                  <button
                    key={e}
                    onClick={() => setConfig({ exam: e })}
                    className={`px-3 py-2 rounded-lg text-xs font-body font-medium text-left transition-all duration-150 ${
                      config.exam === e
                        ? 'bg-emerald-dim border border-emerald-exam/40 text-emerald-exam'
                        : 'border border-white/5 text-white/40 hover:border-white/15 hover:text-white/70'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty + Q count */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Difficulty</p>
              <div className="grid grid-cols-2 gap-2 mb-5">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setConfig({ difficulty: d })}
                    className={`px-3 py-2.5 rounded-lg text-xs font-display font-semibold transition-all duration-150 border ${
                      config.difficulty === d
                        ? DIFF_COLORS[d]
                        : 'border-white/5 text-white/30 hover:border-white/15 hover:text-white/60'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Questions / Section</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={3} max={25}
                  value={config.qPerSection}
                  onChange={e => setConfig({ qPerSection: Math.min(25, Math.max(3, parseInt(e.target.value) || 5)) })}
                  className="w-20 bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-violet/50"
                />
                <span className="text-xs text-white/30 font-body">3 – 25 per section</span>
              </div>
            </div>
          </div>

          {/* ROW 2: Sections */}
          <div className="glass rounded-2xl p-5">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">Sections to Include</p>
            <div className="grid grid-cols-3 gap-2">
              {SECTIONS_LIST.map(sec => {
                const active = config.sections.includes(sec);
                return (
                  <button
                    key={sec}
                    onClick={() => toggleSection(sec)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body text-left transition-all duration-150 border ${
                      active
                        ? 'border-violet/40 bg-violet-dim text-violet-soft'
                        : 'border-white/5 text-white/35 hover:border-white/15 hover:text-white/60'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${active ? 'bg-violet border-violet' : 'border-white/15'}`}>
                      {active && <span className="text-[10px] text-white font-bold">✓</span>}
                    </div>
                    {sec}
                  </button>
                );
              })}
            </div>
          </div>

          {/* START BUTTON */}
          <button
            onClick={handleStart}
            disabled={launching || config.sections.length === 0}
            className="w-full py-5 rounded-2xl font-display font-bold text-lg text-white transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #7c5cfc 0%, #5c3dfc 50%, #7c5cfc 100%)', backgroundSize: '200% 100%' }}
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {launching ? (
                <>
                  <svg className="w-5 h-5 animate-spin-slow" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Launching Exam...
                </>
              ) : (
                <>⚡ Generate &amp; Start Exam</>
              )}
            </span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>

        {/* CONSOLE */}
        <div className="mt-6">
          <ConsolePanel />
        </div>
      </div>
    </div>
  );
}
