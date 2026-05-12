import React from 'react';
import { useExamStore } from '../../store/examStore';
import { getExam, getTiersForExam } from '../../config/examMetadata';

export default function TierSelectPage({ ws }) {
  const { setPage, setNavigation, navigation } = useExamStore();
  const exam = getExam(navigation.selectedExam);
  const tiers = getTiersForExam(navigation.selectedExam);

  const handleTierSelect = (tierId) => {
    setNavigation({ selectedTier: tierId });
    setPage('exam-config');
  };

  const handleBack = () => {
    setPage('board-explorer');
  };

  if (!exam) return <div>Exam not found</div>;

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-white/5 rounded-lg">←</button>
          <span className="font-display font-bold text-lg">{exam.name} · Select Tier</span>
        </div>
      </nav>

      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
        {/* HEADER */}
        <div className="mb-12">
          <div className="text-sm text-white/40 font-mono">
            {exam.name} / Tiers
          </div>
          <h1 className="font-display font-bold text-4xl tracking-tight mt-4">
            {exam.fullName}
          </h1>
          <p className="text-white/40 mt-2">{exam.pattern}</p>
          <p className="text-sm text-white/30 mt-4">{exam.description}</p>
        </div>

        {/* TIERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tiers.map((tier, idx) => (
            <button
              key={tier.id}
              onClick={() => handleTierSelect(tier.id)}
              className="glass rounded-2xl p-8 border border-white/5 hover:border-violet/30 transition-all duration-300 hover:bg-white/2 group text-left animate-fade-up"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-2xl mb-1">{tier.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10">
                      {tier.duration} minutes
                    </span>
                    <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10">
                      {tier.totalQuestions} questions
                    </span>
                    <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10">
                      -{(tier.negativeMarking * 100).toFixed(0)}% negative
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs text-white/40 mb-3 font-mono">SECTIONS</p>
                <div className="space-y-1">
                  {tier.sections.map((section) => (
                    <div key={section} className="text-sm text-white/60">
                      • {section.replace(/-/g, ' ').charAt(0).toUpperCase() + section.replace(/-/g, ' ').slice(1)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 text-violet-soft group-hover:translate-x-1 transition-transform">
                <span className="text-sm font-medium">Continue</span>
                <span>→</span>
              </div>
            </button>
          ))}
        </div>

        {/* INFO */}
        <div className="mt-16 p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-violet-dim/30 to-blue-dim/30">
          <p className="text-sm text-white/60">
            <span className="font-medium text-white">ℹ️ Each tier</span> has different sections, duration, and pattern. Choose based on your preparation level.
          </p>
        </div>
      </div>
    </div>
  );
}
