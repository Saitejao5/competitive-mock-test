import React, { useMemo } from 'react';
import { useExamStore } from '../../store/examStore';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function AnalysisPage() {
  const { config, sections, answers, timings, examStartTime, examEndTime, setPage, resetExam } = useExamStore();

  const analytics = useMemo(() => {
    const allQ = [];
    sections.forEach((sec, si) => {
      sec.questions.forEach((q, qi) => {
        const key = `${si}_${qi}`;
        allQ.push({
          ...q, sectionName: sec.name, sectionIndex: si, qIndex: qi,
          answered: answers[key] || null,
          isCorrect: answers[key] === q.correct,
          time: timings[key] || 0
        });
      });
    });

    const total = allQ.length;
    const attempted = allQ.filter(q => q.answered).length;
    const correct = allQ.filter(q => q.isCorrect).length;
    const wrong = attempted - correct;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const netScore = (correct - wrong * 0.25).toFixed(2);
    const totalTimeMs = examEndTime && examStartTime ? examEndTime - examStartTime : 0;
    const avgTime = attempted > 0 ? Math.round(allQ.filter(q => q.answered).reduce((s, q) => s + q.time, 0) / attempted) : 0;

    // Topic breakdown
    const topicMap = {};
    allQ.filter(q => q.answered).forEach(q => {
      const t = q.topic || q.sectionName;
      if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0, times: [] };
      topicMap[t].total++;
      topicMap[t].times.push(q.time);
      if (q.isCorrect) topicMap[t].correct++;
    });

    const weakAreas = Object.entries(topicMap)
      .map(([name, s]) => ({ name, acc: Math.round((s.correct / s.total) * 100), total: s.total, avgTime: Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length) }))
      .filter(t => t.acc < 70)
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 3);

    // Section perf
    const sectionPerf = sections.map((sec, si) => {
      const secQ = allQ.filter(q => q.sectionIndex === si);
      const sc = secQ.filter(q => q.isCorrect).length;
      const tot = secQ.length;
      const acc = tot > 0 ? Math.round((sc / tot) * 100) : 0;
      return { name: sec.name, correct: sc, total: tot, accuracy: acc };
    });

    return { allQ, total, attempted, correct, wrong, accuracy, netScore, totalTimeMs, avgTime, weakAreas, sectionPerf };
  }, []);

  const { allQ, total, attempted, correct, wrong, accuracy, netScore, totalTimeMs, avgTime, weakAreas, sectionPerf } = analytics;
  const scoreColor = accuracy >= 70 ? 'text-emerald-exam' : accuracy >= 50 ? 'text-gold' : 'text-flame';
  const totalMin = Math.floor(totalTimeMs / 60000);
  const totalSec = Math.floor((totalTimeMs % 60000) / 1000);

  const handleNewTest = () => { resetExam(); setPage('home'); };

  return (
    <div className="relative z-10 min-h-screen">
      {/* NAV */}
      <nav className="glass border-b border-white/5 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-dim border border-violet/30 flex items-center justify-center">
            <span className="text-xs">📊</span>
          </div>
          <span className="font-display font-bold text-base">Exam Analysis</span>
          <span className="tag">{config.exam}</span>
          <span className="tag">{config.difficulty}</span>
        </div>
        <button onClick={handleNewTest} className="btn-ghost text-sm">← New Test</button>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* HERO SCORE */}
        <div className="text-center mb-10 animate-fade-up">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">Your Result</p>
          <div className={`font-display font-bold text-7xl tracking-tight mb-2 ${scoreColor}`}>
            {correct}<span className="text-white/20 text-4xl">/{total}</span>
          </div>
          <p className="text-white/40 font-body">
            {config.exam} • {config.difficulty} • {config.sections.length} Sections • {totalMin}m {totalSec}s
          </p>
        </div>

        {/* SCORE CARDS */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Accuracy', value: `${accuracy}%`, color: scoreColor },
            { label: 'Net Score', value: netScore, color: 'text-violet-soft' },
            { label: 'Avg Time/Q', value: `${avgTime}s`, color: 'text-sky-exam' },
            { label: 'Wrong', value: wrong, color: 'text-flame' }
          ].map(card => (
            <div key={card.label} className="glass rounded-2xl p-5 text-center">
              <div className={`font-display font-bold text-3xl mb-1 ${card.color}`}>{card.value}</div>
              <div className="text-xs font-mono text-white/30 uppercase tracking-widest">{card.label}</div>
            </div>
          ))}
        </div>

        {/* GRID: Section Perf + Weak Areas + Time Chart + Breakdown */}
        <div className="grid grid-cols-2 gap-5 mb-8">
          {/* Section Performance */}
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Section Performance</p>
            <div className="space-y-4">
              {sectionPerf.map(sec => (
                <div key={sec.name}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-body text-white/70">{sec.name}</span>
                    <span className="text-xs font-mono text-white/40">{sec.correct}/{sec.total}</span>
                  </div>
                  <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${sec.accuracy}%`,
                        background: sec.accuracy >= 70 ? '#2dd98a' : sec.accuracy >= 50 ? '#f5a623' : '#ff5757'
                      }}
                    />
                  </div>
                  <div className="text-right text-xs font-mono mt-0.5" style={{ color: sec.accuracy >= 70 ? '#2dd98a' : sec.accuracy >= 50 ? '#f5a623' : '#ff5757' }}>
                    {sec.accuracy}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak Areas */}
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Weak Areas (Top 3)</p>
            {weakAreas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3">
                <span className="text-3xl">🎉</span>
                <p className="text-sm text-emerald-exam font-body">Excellent! No major weak areas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakAreas.map((w, i) => (
                  <div key={w.name} className="flex items-center justify-between p-3.5 rounded-xl bg-flame-dim border border-flame/20">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-white/30">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-body text-white/80">{w.name}</p>
                        <p className="text-xs font-mono text-white/30">{w.total} questions • avg {w.avgTime}s</p>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-flame">{w.acc}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time per Question chart */}
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Time per Question</p>
            <div className="flex items-end gap-1 h-20 mb-2">
              {allQ.filter(q => q.answered).slice(0, 30).map((q, i) => {
                const maxT = Math.max(...allQ.filter(x => x.answered).map(x => x.time), 1);
                const pct = Math.max(4, Math.round((q.time / maxT) * 76));
                const color = q.time < 30 ? '#2dd98a' : q.time < 90 ? '#f5a623' : '#ff5757';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`Q${i + 1}: ${q.time}s`}>
                    <div className="w-full rounded-sm rounded-b-none min-w-[4px]" style={{ height: pct, background: color, minHeight: 4 }} />
                    <span className="text-[8px] font-mono text-white/20">{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs font-mono text-white/30 mt-2">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-exam" />Fast (&lt;30s)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold" />OK (&lt;90s)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-flame" />Slow (&gt;90s)</span>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="glass rounded-2xl p-6">
            <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Score Breakdown</p>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-dim border border-emerald-exam/20">
                <span className="text-sm font-body text-white/70">Correct (+1 each)</span>
                <span className="font-mono text-emerald-exam font-semibold">+{correct}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-flame-dim border border-flame/20">
                <span className="text-sm font-body text-white/70">Wrong (−0.25 each)</span>
                <span className="font-mono text-flame font-semibold">−{(wrong * 0.25).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/3 border border-white/8">
                <span className="text-sm font-body text-white/70">Unattempted</span>
                <span className="font-mono text-white/40">{total - attempted}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-violet-dim border border-violet/30 mt-1">
                <span className="font-display font-semibold text-white">Net Score</span>
                <span className="font-display font-bold text-xl text-violet-soft">{netScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FULL QUESTION REVIEW */}
        <div className="glass rounded-2xl p-6 mb-8">
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest mb-5">Question-by-Question Review</p>
          <div className="space-y-3">
            {allQ.map((q, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border ${
                  !q.answered ? 'border-white/5 bg-white/2' :
                  q.isCorrect ? 'border-emerald-exam/20 bg-emerald-dim' :
                  'border-flame/20 bg-flame-dim'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-sm font-mono shrink-0 w-6 ${q.isCorrect ? 'text-emerald-exam' : q.answered ? 'text-flame' : 'text-white/25'}`}>
                    {q.isCorrect ? '✓' : q.answered ? '✗' : '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-white/80 mb-1.5 leading-relaxed">
                      <span className="text-white/30 mr-2">Q{i + 1}</span>{q.question}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs font-mono">
                      {q.answered && (
                        <>
                          <span className={q.isCorrect ? 'text-emerald-exam' : 'text-flame'}>
                            Your: {q.answered} — {q.options[OPTION_LETTERS.indexOf(q.answered)]}
                          </span>
                          {!q.isCorrect && (
                            <span className="text-emerald-exam">
                              Correct: {q.correct} — {q.options[OPTION_LETTERS.indexOf(q.correct)]}
                            </span>
                          )}
                        </>
                      )}
                      <span className="text-white/25">⏱ {q.time}s</span>
                      <span className="text-white/25">{q.topic || q.sectionName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-center gap-4">
          <button onClick={handleNewTest} className="btn-ghost">← New Test</button>
          <button onClick={handleNewTest} className="btn-primary">🎯 Practice Weak Areas</button>
        </div>
      </div>
    </div>
  );
}
