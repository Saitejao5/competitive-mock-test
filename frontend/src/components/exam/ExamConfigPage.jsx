import React, { useState, useMemo } from 'react';
import { useExamStore } from '../../store/examStore';
import { getExam, getTier, getSectionsForTier, DIFFICULTY_LEVELS } from '../../config/examMetadata';

export default function ExamConfigPage({ ws }) {
  const { setPage, setNavigation, navigation, setConfig, config, wsStatus, addLog } = useExamStore();
  const exam = getExam(navigation.selectedExam);
  const tier = getTier(navigation.selectedTier);
  const availableSections = useMemo(() => getSectionsForTier(navigation.selectedTier), [navigation.selectedTier]);

  const [selectedSections, setSelectedSections] = useState(tier?.sections || []);
  const [difficulty, setDifficulty] = useState('medium');
  const [qPerSection, setQPerSection] = useState(5);
  const [launching, setLaunching] = useState(false);

  const toggleSection = (sectionId) => {
    setSelectedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleStart = () => {
    if (selectedSections.length === 0) {
      alert('Please select at least one section');
      return;
    }
    if (wsStatus !== 'connected') {
      addLog('Backend not connected — start the Node.js server on port 3001', 'error');
      alert('Backend server not connected. Start with: cd backend && npm run dev');
      return;
    }

    setLaunching(true);
    setTimeout(() => {
      setConfig({
        exam: exam.name,
        difficulty,
        qPerSection,
        sections: selectedSections,
        mode: 'exam'
      });
      setPage('exam');
      ws.startExam({
        exam: exam.name,
        difficulty,
        qPerSection,
        sections: selectedSections,
        tier: navigation.selectedTier
      });
      setLaunching(false);
    }, 300);
  };

  const handleBack = () => {
    setPage('tier-select');
  };

  if (!exam || !tier) return <div>Configuration not found</div>;

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-white/5 rounded-lg">←</button>
          <span className="font-display font-bold text-lg">Configure Exam</span>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
        {/* HEADER */}
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl tracking-tight mb-2">
            {exam.name} · {tier.name}
          </h1>
          <p className="text-white/40">Customize your practice session</p>
        </div>

        {/* CONFIGURATION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: SECTIONS */}
          <div className="lg:col-span-2">
            <div className="glass rounded-2xl p-8 border border-white/5">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-6">
                Select Sections
              </p>
              
              <div className="space-y-3">
                {tier.sections.map((sectionId) => {
                  const section = availableSections.find(s => s.id === sectionId);
                  const isSelected = selectedSections.includes(sectionId);
                  
                  if (!section) return null;

                  return (
                    <button
                      key={sectionId}
                      onClick={() => toggleSection(sectionId)}
                      className={`w-full text-left px-4 py-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                        isSelected
                          ? 'bg-violet-dim border-violet/40'
                          : 'border-white/5 bg-white/2 hover:border-white/15 hover:bg-white/3'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border ${
                        isSelected ? 'bg-violet border-violet' : 'border-white/15'
                      }`}>
                        {isSelected && <span className="text-[12px] text-white font-bold">✓</span>}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{section.name}</p>
                        <p className="text-xs text-white/30">{section.alias}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SELECTED COUNT */}
              <div className="mt-6 p-4 rounded-lg bg-white/2 border border-white/5">
                <p className="text-sm">
                  <span className="font-medium text-white">{selectedSections.length}</span>
                  <span className="text-white/40"> sections selected</span>
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: DIFFICULTY & PARAMS */}
          <div className="space-y-6">
            {/* DIFFICULTY */}
            <div className="glass rounded-2xl p-6 border border-white/5">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">
                Difficulty
              </p>
              
              <div className="space-y-2">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setDifficulty(level.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      difficulty === level.id
                        ? 'bg-violet-dim border-violet/40 text-white'
                        : 'border-white/5 text-white/40 hover:border-white/15 hover:text-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{level.name}</span>
                      <span className="text-xs">{level.badge}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* QUESTIONS PER SECTION */}
            <div className="glass rounded-2xl p-6 border border-white/5">
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-4">
                Questions / Section
              </p>
              
              <input
                type="range"
                min={3}
                max={25}
                value={qPerSection}
                onChange={(e) => setQPerSection(parseInt(e.target.value))}
                className="w-full mb-3"
              />
              
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={3}
                  max={25}
                  value={qPerSection}
                  onChange={(e) => setQPerSection(Math.min(25, Math.max(3, parseInt(e.target.value) || 5)))}
                  className="flex-1 bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet/50"
                />
                <span className="text-xs text-white/30">questions</span>
              </div>
            </div>

            {/* SERVER STATUS */}
            <div className={`rounded-2xl p-6 border ${
              wsStatus === 'connected'
                ? 'bg-emerald-dim/20 border-emerald-exam/30'
                : wsStatus === 'connecting'
                ? 'bg-gold-dim/20 border-gold/30'
                : 'bg-flame-dim/20 border-flame/30'
            }`}>
              <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-2">
                Server Status
              </p>
              <p className={`text-sm font-medium ${
                wsStatus === 'connected'
                  ? 'text-emerald-exam'
                  : wsStatus === 'connecting'
                  ? 'text-gold'
                  : 'text-flame'
              }`}>
                {wsStatus === 'connected' ? '✓ Connected' : wsStatus === 'connecting' ? '⟳ Connecting...' : '✗ Disconnected'}
              </p>
            </div>
          </div>
        </div>

        {/* START BUTTON */}
        <button
          onClick={handleStart}
          disabled={launching || selectedSections.length === 0 || wsStatus !== 'connected'}
          className="w-full mt-12 py-6 rounded-2xl font-display font-bold text-lg text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #7c5cfc 0%, #5c3dfc 50%, #7c5cfc 100%)',
            backgroundSize: '200% 100%'
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {launching ? (
              <>
                <svg className="w-5 h-5 animate-spin-slow" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Generating Exam...
              </>
            ) : (
              <>
                <span>🚀 Start Exam</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </>
            )}
          </span>
        </button>

        {/* INFO BOX */}
        <div className="mt-8 p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-violet-dim/30 to-blue-dim/30">
          <p className="text-sm text-white/60">
            <span className="font-medium text-white">⚡ Ready:</span> Your exam will be generated in real-time with AI questions. Each session gets completely unique questions.
          </p>
        </div>
      </div>
    </div>
  );
}
