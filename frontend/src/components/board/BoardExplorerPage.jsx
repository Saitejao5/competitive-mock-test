import React, { useState } from 'react';
import { useExamStore } from '../../store/examStore';
import { EXAM_BOARDS, getExamsForBoard } from '../../config/examMetadata';

export default function BoardExplorerPage({ ws }) {
  const { setPage, setNavigation, navigation } = useExamStore();
  const [expandedBoard, setExpandedBoard] = useState(null);

  const boards = Object.values(EXAM_BOARDS);

  const handleBoardSelect = (boardId) => {
    setNavigation({ selectedBoard: boardId });
    setExpandedBoard(expandedBoard === boardId ? null : boardId);
  };

  const handleExamSelect = (examId) => {
    setNavigation({ selectedExam: examId });
    setPage('tier-select');
  };

  const handleBackClick = () => {
    setPage('landing');
    setNavigation({ selectedBoard: null, selectedExam: null, selectedTier: null });
  };

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            ←
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet to-violet-soft flex items-center justify-center">
            <span className="text-white font-bold text-lg">⚡</span>
          </div>
          <span className="font-display font-bold text-lg">Explore Exams</span>
        </div>
      </nav>

      <div className="flex-1 max-w-5xl mx-auto w-full px-8 py-12">
        {/* BREADCRUMB */}
        <div className="mb-12">
          <div className="text-sm text-white/40 font-mono">
            Platform / Boards / Exams
          </div>
          <h1 className="font-display font-bold text-4xl tracking-tight mt-4">
            Choose Your Exam Board
          </h1>
          <p className="text-white/40 mt-3">
            Select a board to explore available exams and start practicing
          </p>
        </div>

        {/* BOARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boards.map((board) => {
            const exams = getExamsForBoard(board.id);
            const isExpanded = expandedBoard === board.id;

            return (
              <div key={board.id} className="glass rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300">
                {/* BOARD HEADER */}
                <button
                  onClick={() => handleBoardSelect(board.id)}
                  className="w-full px-6 py-6 text-left hover:bg-white/2 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{board.icon}</span>
                    <div>
                      <h3 className="font-display font-bold text-lg">{board.name}</h3>
                      <p className="text-xs text-white/40">{board.description}</p>
                    </div>
                  </div>
                  <div className={`text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </div>
                </button>

                {/* EXAMS LIST */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-6 py-4 space-y-2">
                    {exams.map((exam) => (
                      <button
                        key={exam.id}
                        onClick={() => handleExamSelect(exam.id)}
                        className="w-full text-left px-4 py-3 rounded-lg bg-white/2 hover:bg-white/5 transition-colors border border-white/5 hover:border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <span>{exam.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{exam.name}</p>
                            <p className="text-xs text-white/30">{exam.fullName}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* INFO BOX */}
        <div className="mt-16 p-6 rounded-2xl border border-white/5 bg-gradient-to-r from-violet-dim/30 to-blue-dim/30">
          <p className="text-sm text-white/60">
            <span className="font-medium text-white">💡 Tip:</span> Each exam has different tiers and sections. Select an exam to customize your practice session.
          </p>
        </div>
      </div>
    </div>
  );
}
