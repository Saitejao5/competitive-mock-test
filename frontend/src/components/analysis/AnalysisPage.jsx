import React, { useMemo, useState } from 'react';
import { useExamStore } from '../../store/examStore';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const pct = (value, total) => (total > 0 ? Math.round((value / total) * 100) : 0);
const avg = (items) => (items.length ? Math.round(items.reduce((sum, item) => sum + item, 0) / items.length) : 0);

export default function AnalysisPage() {
  const { config, sections, answers, timings, examStartTime, examEndTime, setPage, resetExam } = useExamStore();
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const analytics = useMemo(() => {
    const allQ = [];

    sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, qIndex) => {
        const key = `${sectionIndex}_${qIndex}`;
        const answered = answers[key] || null;
        const topic = question.topic || question.subtopic || section.name;
        const difficulty = question.difficulty || config.difficulty || 'Exam level';

        allQ.push({
          ...question,
          sectionName: section.name,
          sectionIndex,
          qIndex,
          answered,
          topic,
          difficulty,
          isCorrect: answered === question.correct,
          time: timings[key] || 0
        });
      });
    });

    const total = allQ.length;
    const attempted = allQ.filter(q => q.answered).length;
    const correct = allQ.filter(q => q.isCorrect).length;
    const wrong = attempted - correct;
    const unanswered = total - attempted;
    const accuracy = pct(correct, attempted);
    const avgTime = avg(allQ.filter(q => q.answered).map(q => q.time));
    const totalTimeMs = examEndTime && examStartTime ? examEndTime - examStartTime : 0;
    const netScore = correct - wrong * 0.25;

    const byTopic = Object.values(allQ.reduce((map, q) => {
      if (!map[q.topic]) map[q.topic] = { name: q.topic, total: 0, correct: 0, wrong: 0, times: [] };
      map[q.topic].total += 1;
      map[q.topic].correct += q.isCorrect ? 1 : 0;
      map[q.topic].wrong += q.answered && !q.isCorrect ? 1 : 0;
      if (q.answered) map[q.topic].times.push(q.time);
      return map;
    }, {})).map(item => ({
      ...item,
      accuracy: pct(item.correct, item.total),
      avgTime: avg(item.times)
    })).sort((a, b) => a.accuracy - b.accuracy);

    const bySection = sections.map((section, sectionIndex) => {
      const items = allQ.filter(q => q.sectionIndex === sectionIndex);
      const sectionCorrect = items.filter(q => q.isCorrect).length;
      const sectionAttempted = items.filter(q => q.answered).length;
      return {
        name: section.name,
        total: items.length,
        attempted: sectionAttempted,
        correct: sectionCorrect,
        accuracy: pct(sectionCorrect, sectionAttempted),
        avgTime: avg(items.filter(q => q.answered).map(q => q.time))
      };
    });

    const difficultyDistribution = Object.values(allQ.reduce((map, q) => {
      const key = q.difficulty;
      if (!map[key]) map[key] = { name: key, total: 0, correct: 0 };
      map[key].total += 1;
      map[key].correct += q.isCorrect ? 1 : 0;
      return map;
    }, {})).map(item => ({ ...item, accuracy: pct(item.correct, item.total) }));

    const slowestTopic = [...byTopic].sort((a, b) => b.avgTime - a.avgTime)[0];
    const weakestTopic = byTopic.find(item => item.total > 0 && item.accuracy < 70);
    const strongestTopic = [...byTopic].reverse().find(item => item.total > 0);
    const timeOverAvg = slowestTopic && avgTime ? Math.max(0, Math.round(((slowestTopic.avgTime - avgTime) / avgTime) * 100)) : 0;
    const negativeLoss = wrong * 0.25;

    const insights = [
      slowestTopic && slowestTopic.avgTime > avgTime
        ? `You spend ${timeOverAvg}% more time on ${slowestTopic.name} questions than your overall average.`
        : 'Your time per question is fairly balanced across attempted topics.',
      weakestTopic
        ? `Your accuracy drops to ${weakestTopic.accuracy}% in ${weakestTopic.name}. Start the next practice set there.`
        : 'No major weak topic crossed the risk threshold in this attempt.',
      wrong > 0
        ? `Negative marking cost you ${negativeLoss.toFixed(2)} marks. Review wrong attempts before increasing speed.`
        : 'You avoided negative marking in this test.'
    ].filter(Boolean);

    return {
      allQ,
      total,
      attempted,
      correct,
      wrong,
      unanswered,
      accuracy,
      avgTime,
      totalTimeMs,
      netScore,
      byTopic,
      bySection,
      difficultyDistribution,
      weakAreas: byTopic.filter(item => item.accuracy < 70).slice(0, 4),
      strongestTopic,
      insights
    };
  }, [answers, config.difficulty, examEndTime, examStartTime, sections, timings]);

  const handleNewTest = () => {
    resetExam();
    setPage('landing');
  };

  const minutes = Math.floor(analytics.totalTimeMs / 60000);
  const seconds = Math.floor((analytics.totalTimeMs % 60000) / 1000);
  const scoreColor = analytics.accuracy >= 70 ? 'text-emerald-exam' : analytics.accuracy >= 50 ? 'text-gold' : 'text-flame';

  return (
    <div className="analytics-shell min-h-screen">
      <nav className="glass sticky top-0 z-50 flex items-center justify-between border-b border-white/5 px-5 py-4 md:px-8">
        <div>
          <p className="eyebrow mb-1">Post exam analytics</p>
          <h1 className="font-display text-xl font-bold">{config.exam} performance report</h1>
        </div>
        <button type="button" onClick={handleNewTest} className="btn-ghost">New test</button>
      </nav>

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <section className="analytics-hero">
          <div>
            <p className="eyebrow mb-3">Final score</p>
            <div className={`font-display text-6xl font-bold md:text-7xl ${scoreColor}`}>
              {analytics.correct}
              <span className="ml-2 text-4xl text-white/22">/{analytics.total}</span>
            </div>
            <p className="mt-3 text-white/45">
              {config.difficulty} difficulty - {minutes}m {seconds}s - {config.sections.length} sections
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Accuracy" value={`${analytics.accuracy}%`} tone={scoreColor} />
            <Metric label="Speed" value={`${analytics.avgTime}s/q`} tone="text-sky-exam" />
            <Metric label="Net score" value={analytics.netScore.toFixed(2)} tone="text-violet-soft" />
            <Metric label="Negative impact" value={`-${(analytics.wrong * 0.25).toFixed(2)}`} tone="text-flame" />
          </div>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel title="AI insights">
            <div className="space-y-3">
              {analytics.insights.map((insight, index) => (
                <div key={insight} className="insight-row">
                  <span className="insight-index">{index + 1}</span>
                  <p>{insight}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Improvement recommendations">
            <div className="space-y-3">
              {(analytics.weakAreas.length ? analytics.weakAreas : analytics.byTopic.slice(0, 3)).map(area => (
                <div key={area.name} className="recommendation-row">
                  <div>
                    <p className="font-semibold text-white/85">{area.name}</p>
                    <p className="text-xs text-white/40">{area.accuracy}% accuracy - avg {area.avgTime}s</p>
                  </div>
                  <span className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/55">Practice</span>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Topic mastery">
            <MasteryList items={analytics.byTopic} />
          </Panel>

          <Panel title="Time analysis">
            <BarList items={analytics.bySection.map(item => ({ label: item.name, value: item.avgTime, suffix: 's' }))} />
          </Panel>

          <Panel title="Difficulty distribution">
            <BarList items={analytics.difficultyDistribution.map(item => ({ label: item.name, value: item.total, suffix: ` q - ${item.accuracy}%` }))} />
          </Panel>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Panel title="Weak areas">
            {analytics.weakAreas.length ? (
              <MasteryList items={analytics.weakAreas} danger />
            ) : (
              <p className="text-sm text-emerald-exam">No weak area detected from this attempt.</p>
            )}
          </Panel>

          <Panel title="Negative marking insights">
            <div className="space-y-3 text-sm text-white/60">
              <div className="score-line"><span>Wrong attempts</span><strong className="text-flame">{analytics.wrong}</strong></div>
              <div className="score-line"><span>Penalty per wrong answer</span><strong>0.25</strong></div>
              <div className="score-line"><span>Total penalty</span><strong className="text-flame">-{(analytics.wrong * 0.25).toFixed(2)}</strong></div>
              <div className="score-line"><span>Unattempted saved from penalty</span><strong>{analytics.unanswered}</strong></div>
            </div>
          </Panel>

          <Panel title="Attempt profile">
            <div className="space-y-3 text-sm text-white/60">
              <div className="score-line"><span>Attempted</span><strong>{analytics.attempted}</strong></div>
              <div className="score-line"><span>Correct</span><strong className="text-emerald-exam">{analytics.correct}</strong></div>
              <div className="score-line"><span>Unattempted</span><strong>{analytics.unanswered}</strong></div>
              <div className="score-line"><span>Best topic</span><strong>{analytics.strongestTopic?.name || 'N/A'}</strong></div>
            </div>
          </Panel>
        </section>

        <Panel title="Answer review" className="mt-5">
          <p className="mb-4 text-sm text-white/40">Answers and shortcut explanations are hidden by default. Open a question to review it.</p>
          <div className="space-y-3">
            {analytics.allQ.map((q, index) => {
              const expanded = expandedQuestions[index];
              const status = !q.answered ? 'Unattempted' : q.isCorrect ? 'Correct' : 'Wrong';

              return (
                <article key={`${q.sectionName}-${q.qIndex}`} className="review-item">
                  <button
                    type="button"
                    onClick={() => setExpandedQuestions(prev => ({ ...prev, [index]: !prev[index] }))}
                    className="flex w-full items-start justify-between gap-4 text-left"
                  >
                    <div className="min-w-0">
                      <p className="mb-2 text-sm font-semibold text-white/85">Q{index + 1}. {q.question}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-white/38">
                        <span>{q.sectionName}</span>
                        <span>{q.topic}</span>
                        <span>{q.time}s</span>
                        <span className={q.isCorrect ? 'text-emerald-exam' : q.answered ? 'text-flame' : 'text-white/35'}>{status}</span>
                      </div>
                    </div>
                    <span className={`mt-1 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}>v</span>
                  </button>

                  {expanded && (
                    <div className="mt-4 border-t border-white/8 pt-4">
                      <div className="grid gap-2">
                        {OPTION_LETTERS.map((letter, optionIndex) => {
                          const correct = letter === q.correct;
                          const selected = letter === q.answered;
                          return (
                            <div key={letter} className={`answer-option ${correct ? 'answer-option-correct' : selected ? 'answer-option-wrong' : ''}`}>
                              <span className="font-mono font-bold">{letter}</span>
                              <span>{q.options[optionIndex]}</span>
                              {correct && <strong>Correct answer</strong>}
                              {selected && !correct && <strong>Your answer</strong>}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 rounded-xl border border-violet/20 bg-violet-dim/20 p-4">
                        <p className="eyebrow mb-2">Shortcut explanation</p>
                        <p className="text-sm leading-6 text-white/75">{q.explanation || 'Explanation was not returned for this question.'}</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="metric-card">
      <div className={`font-display text-3xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-widest text-white/35">{label}</div>
    </div>
  );
}

function Panel({ title, children, className = '' }) {
  return (
    <section className={`glass rounded-2xl border border-white/6 p-5 ${className}`}>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/35">{title}</h2>
      {children}
    </section>
  );
}

function MasteryList({ items, danger = false }) {
  if (!items.length) return <p className="text-sm text-white/40">No data yet.</p>;

  return (
    <div className="space-y-3">
      {items.slice(0, 6).map(item => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between gap-4 text-sm">
            <span className="truncate text-white/70">{item.name}</span>
            <span className={danger || item.accuracy < 70 ? 'text-flame' : 'text-emerald-exam'}>{item.accuracy}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className={`h-full rounded-full ${danger || item.accuracy < 70 ? 'bg-flame' : 'bg-emerald-exam'}`} style={{ width: `${item.accuracy}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BarList({ items }) {
  const max = Math.max(...items.map(item => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-4 text-sm">
            <span className="truncate text-white/70">{item.label}</span>
            <span className="text-white/45">{item.value}{item.suffix}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-exam to-violet" style={{ width: `${Math.max(8, Math.round((item.value / max) * 100))}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
