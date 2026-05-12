import React from 'react';
import { useExamStore } from '../../store/examStore';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function SectionView() {
  const {
    sections,
    currentSectionIndex,
    currentQIndex,
    answers,
    setAnswer,
    setCurrentQ,
    saveCurrentTiming
  } = useExamStore();

  const section = sections[currentSectionIndex];

  if (!section) return null;

  if (section.status === 'generating' || section.status === 'pending') {
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">AI question stream</p>
            <h2 className="font-display text-3xl font-bold">{section.name}</h2>
          </div>
          <span className="status-pill status-pill-warn">
            <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
            {section.status === 'pending' ? 'Queued' : 'Generating'}
          </span>
        </div>

        <div className="exam-card space-y-6">
          <div className="shimmer-box h-6 w-3/4" />
          <div className="space-y-3">
            <div className="shimmer-box h-4 w-full" />
            <div className="shimmer-box h-4 w-11/12" />
            <div className="shimmer-box h-4 w-8/12" />
          </div>
          <div className="grid gap-3">
            {[1, 2, 3, 4].map(item => (
              <div key={item} className="shimmer-box h-16" />
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Your section is being generated in the background. The exam will unlock as soon as questions arrive.
        </p>
      </div>
    );
  }

  if (section.status === 'error') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-24 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-flame/30 bg-flame-dim text-flame">
          !
        </div>
        <h2 className="font-display text-2xl font-bold">Section generation failed</h2>
        <p className="mt-2 text-sm text-white/45">Try another ready section or restart the test after checking the backend console.</p>
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

  const goNext = () => {
    if (currentQIndex < questions.length - 1) {
      saveCurrentTiming();
      setCurrentQ(currentQIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentQIndex > 0) {
      saveCurrentTiming();
      setCurrentQ(currentQIndex - 1);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="exam-card">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-5">
          <div>
            <p className="eyebrow mb-2">{section.name}</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Question {currentQIndex + 1}
              <span className="ml-2 text-lg font-medium text-white/35">of {questions.length}</span>
            </h1>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/55">
            {answered ? 'Response saved' : 'Not answered'}
          </div>
        </div>

        <p className="mb-8 text-xl leading-8 text-white/90">{q.question}</p>

        <div className="grid gap-3">
          {OPTION_LETTERS.map((letter, index) => {
            const isSelected = answered === letter;

            return (
              <button
                key={letter}
                type="button"
                onClick={() => handleAnswer(letter)}
                disabled={Boolean(answered)}
                className={`option-row ${isSelected ? 'option-row-selected' : ''} ${answered ? 'cursor-default' : ''}`}
              >
                <span className={`option-letter ${isSelected ? 'option-letter-selected' : ''}`}>{letter}</span>
                <span className="flex-1 text-left">{q.options[index]}</span>
                {isSelected && <span className="text-sm font-semibold text-violet-soft">Selected</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentQIndex === 0}
          className="btn-ghost disabled:pointer-events-none disabled:opacity-30"
        >
          Previous
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {questions.slice(Math.max(0, currentQIndex - 4), Math.min(questions.length, currentQIndex + 5)).map((_, relIdx) => {
            const start = Math.max(0, currentQIndex - 4);
            const abs = start + relIdx;
            const done = answers[`${currentSectionIndex}_${abs}`];
            return (
              <button
                key={abs}
                type="button"
                onClick={() => {
                  saveCurrentTiming();
                  setCurrentQ(abs);
                }}
                className={`q-dot ${abs === currentQIndex ? 'q-dot-active' : done ? 'q-dot-done' : ''}`}
                title={`Question ${abs + 1}`}
              >
                {abs + 1}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={currentQIndex === questions.length - 1}
          className="btn-primary disabled:pointer-events-none disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}
