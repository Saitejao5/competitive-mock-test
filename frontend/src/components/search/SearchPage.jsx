import React, { useEffect, useMemo, useState } from 'react';
import { useExamStore } from '../../store/examStore';
import { unifiedSearch } from '../../config/examMetadata';

const FILTERS = ['all', 'boards', 'exams', 'tiers', 'papers', 'topics', 'subtopics'];

export default function SearchPage() {
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, setPage, setNavigation } = useExamStore();
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    setSearchResults(unifiedSearch(searchQuery));
  }, [searchQuery, setSearchResults]);

  const resultGroups = useMemo(() => ([
    { key: 'boards', label: 'Boards', items: searchResults.boards || [] },
    { key: 'exams', label: 'Exams', items: searchResults.exams || [] },
    { key: 'tiers', label: 'Tiers', items: searchResults.tiers || [] },
    { key: 'papers', label: 'Papers', items: searchResults.papers || [] },
    { key: 'topics', label: 'Topics', items: searchResults.topics || [] },
    { key: 'subtopics', label: 'Subtopics', items: searchResults.subtopics || [] }
  ]), [searchResults]);

  const visibleGroups = activeFilter === 'all'
    ? resultGroups
    : resultGroups.filter(group => group.key === activeFilter);

  const resultCount = resultGroups.reduce((sum, group) => sum + group.items.length, 0);

  const handleSelect = (item) => {
    if (item.type === 'board') {
      setNavigation({ selectedBoard: item.id });
      setSearchQuery('');
      setPage('board-explorer');
      return;
    }

    if (item.type === 'exam') {
      setNavigation({ selectedBoard: item.board, selectedExam: item.id });
      setSearchQuery('');
      setPage('tier-select');
      return;
    }

    if (item.examId) {
      setNavigation({ selectedExam: item.examId, selectedTier: item.tierId || item.id });
      setSearchQuery('');
      setPage('exam-config');
      return;
    }
  };

  return (
    <div className="relative z-10 min-h-screen">
      <nav className="glass sticky top-0 z-50 flex items-center justify-between border-b border-white/5 px-5 py-4 md:px-8">
        <button type="button" onClick={() => setSearchQuery('')} className="btn-ghost">Back</button>
        <div className="hidden text-sm text-white/40 sm:block">Unified exam search</div>
      </nav>

      <main className="mx-auto max-w-6xl px-5 py-10 md:px-8">
        <section className="mb-8">
          <p className="eyebrow mb-3">Search results</p>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{searchQuery}</h1>
          <p className="mt-3 text-white/45">{resultCount} matches across boards, exams, topics, subtopics, tiers, and papers.</p>
        </section>

        <div className="mb-8 flex flex-wrap gap-2">
          {FILTERS.map(filter => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`filter-chip ${activeFilter === filter ? 'filter-chip-active' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {resultCount === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-white/50">No results found. Try SSC, SSC CGL Tier 1, RRB ALP, Arithmetic, or Coding Decoding.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {visibleGroups.filter(group => group.items.length > 0).map(group => (
              <section key={group.key} className="glass rounded-2xl border border-white/6 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">{group.label}</h2>
                  <span className="text-xs text-white/35">{group.items.length} results</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {group.items.map(item => (
                    <button
                      key={`${group.key}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className="search-result-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white/90">{item.name}</p>
                          <p className="mt-1 text-sm text-white/42">
                            {item.fullName || item.description || item.examName || item.topicName || `${item.totalQuestions || ''} questions`}
                          </p>
                        </div>
                        <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-white/35">{item.type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
