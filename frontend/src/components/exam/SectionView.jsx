import React, { useState, useEffect } from 'react';
import { useExamStore } from '../../store/examStore';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function SectionView() {
  const { sections, currentSectionIndex, currentQIndex, answers, setAnswer, setCurrentQ, saveCurrentTiming } = useExamStore();
  const [showExpl, setShowExpl] = useState(false);

  const section = sections[currentSectionIndex];

  // Reset explanation when question changes
  useEffect(() => { setShowExpl(false); }, [currentSectionIndex, currentQIndex]);

  if (!section) return null;

  // Generating state — skeleton
  if (section.status === 'generating' || section.status === 'pending') {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
          <h2 className="font-display font-bold text-2xl">{section.name}</h2>
          <span className="tag border-gold/30 text-gold bg-gold-dim animate-pulse-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            {section.status === 'pending' ? 'Queued' : 'AI Generating...'}
          </span>
        </div>
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-2xl p-6 space-y-4">
              <div className="shimmer-box h-5 w-3/4" />
              <div className="shimmer-box h-4 w-full" />
              <div className="shimmer-box h-4 w-5/6" />
              <div className="space-y-2 mt-4">
                {[1, 2, 3, 4].map(j => <div key={j} className="shimmer-box h-11" />)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-white/30 font-mono mt-8 animate-pulse-soft">
          ⚡ AI is crafting {section.name} questions — generating in background...
        </p>
      </div>
    );
  }

  // Error state
  if (section.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-flame-dim border border-flame/30 flex items-center justify-center text-2xl">✗</div>
        <p className="font-display font-semibold text-lg">Failed to generate {section.name}</p>
        <p className="text-white/40 text-sm">Check the console for details. Try switching sections.</p>
      </div>
    );
  }

  const questions = section.questions;
  const q = questions[currentQIndex];
  if (!q) return null;

  const qKey = `${currentSectionIndex}_${currentQIndex}`;
  const answered = answers[qKey];

  const handleAnswer = (letter) => {
    if (answered) return;
    saveCurrentTiming();
    setAnswer(currentSectionIndex, currentQIndex, letter);
  };

  const goNext = () => { saveCurrentTiming(); setCurrentQ(currentQIndex + 1); };
  const goPrev = () => { saveCurrentTiming(); setCurrentQ(currentQIndex - 1); };

  return (
    <div className="animate-fade-in">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8">
        <h2 className="font-display font-bold text-2xl">{section.name}</h2>
        <span className="tag border-emerald-exam/30 text-emerald-exam bg-emerald-dim">
          ✓ {questions.length} questions ready
        </span>
        <span className="tag ml-auto">{currentQIndex + 1} / {questions.length}</span>
      </div>

      {/* Question Card */}
      <div className="glass rounded-2xl p-7 mb-5 animate-slide-in">
        {/* Meta */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/30">Q{currentQIndex + 1}</span>
            <span className="w-1 h-1 rounded-full bg-white/15" />
            <span className="text-xs font-mono text-white/30">{q.topic || section.name}</span>
          </div>
          <span className="text-xs font-mono text-white/20">
            {useExamStore.getState().timings[qKey] || 0}s spent
          </span>
        </div>

        {/* Question text */}
        <p className="font-body text-base leading-relaxed text-white/90 mb-7">{q.question}</p>

        {/* Options */}
        <div className="space-y-2.5">
          {OPTION_LETTERS.map((letter, i) => {
            const isSelected = answered === letter;
            const isCorrect = answered && letter === q.correct;
            const isWrong = answered && isSelected && letter !== q.correct;

            let cls = 'border-white/8 text-white/50 hover:border-white/20 hover:text-white/80 hover:bg-white/3';
            if (isCorrect) cls = 'border-emerald-exam/60 bg-emerald-dim text-emerald-exam';
            else if (isWrong) cls = 'border-flame/60 bg-flame-dim text-flame';
            else if (isSelected) cls = 'border-violet/60 bg-violet-dim text-violet-soft';
            else if (answered) cls = 'border-white/5 text-white/30 cursor-default';

            return (
              <button
                key={letter}
                onClick={() => handleAnswer(letter)}
                disabled={!!answered}
                className={`w-full flex items-start gap-4 px-5 py-3.5 rounded-xl border text-left text-sm font-body transition-all duration-150 ${cls}`}
              >
                <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-mono font-semibold shrink-0 mt-0.5 transition-all ${
                  isCorrect ? 'bg-emerald-exam border-emerald-exam text-ink-950' :
                  isWrong ? 'bg-flame border-flame text-white' :
                  isSelected ? 'bg-violet border-violet text-white' :
                  'border-white/15 text-white/30'
                }`}>
                  {letter}
                </span>
                <span className="leading-relaxed">{q.options[i]}</span>
                {isCorrect && <span className="ml-auto shrink-0 text-emerald-exam">✓</span>}
                {isWrong && <span className="ml-auto shrink-0 text-flame">✗</span>}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div className="mt-5 border-t border-white/5 pt-5">
            <button
              onClick={() => setShowExpl(!showExpl)}
              className="flex items-center gap-2 text-xs font-mono text-violet-soft hover:text-white transition-colors"
            >
              <span>{showExpl ? '▲' : '▼'}</span>
              {showExpl ? 'Hide' : 'Show'} Explanation
            </button>
            {showExpl && (
              <div className="mt-3 p-4 rounded-xl bg-violet-dim border border-violet/15 text-sm font-body text-white/70 leading-relaxed animate-fade-in">
                <p className="text-violet-soft font-medium mb-1">
                  Correct Answer: <strong>{q.correct}</strong> — {q.options[OPTION_LETTERS.indexOf(q.correct)]}
                </p>
                <p>{q.explanation}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={currentQIndex === 0}
          className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <div className="flex gap-1.5">
          {questions.slice(Math.max(0, currentQIndex - 3), Math.min(questions.length, currentQIndex + 4)).map((_, relIdx) => {
            const abs = relIdx + Math.max(0, currentQIndex - 3);
            const done = answers[`${currentSectionIndex}_${abs}`];
            return (
              <button
                key={abs}
                onClick={() => { saveCurrentTiming(); setCurrentQ(abs); }}
                className={`w-7 h-7 rounded-md text-[10px] font-mono transition-all ${
                  abs === currentQIndex ? 'bg-violet text-white' :
                  done ? 'bg-violet-dim border border-violet/30 text-violet-soft' :
                  'border border-white/10 text-white/30 hover:border-white/25'
                }`}
              >
                {abs + 1}
              </button>
            );
          })}
        </div>

        {currentQIndex < questions.length - 1 ? (
          <button onClick={goNext} className="btn-primary text-sm">
            Next →
          </button>
        ) : (
          <button
            onClick={() => {
              const nextSec = sections.findIndex((s, i) => i > currentSectionIndex && s.status === 'ready');
              if (nextSec !== -1) useExamStore.getState().setCurrentSection(nextSec);
            }}
            className="px-5 py-2.5 rounded-xl font-display font-semibold text-sm text-ink-950 transition-all"
            style={{ background: 'linear-gradient(135deg, #2dd98a, #20b570)' }}
          >
            Next Section →
          </button>
        )}
      </div>
    </div>
  );
}
