import React from 'react';
import { useExamStore } from '../../store/examStore';

export default function PracticeModeSelectPage({ ws }) {
  const { setPage, navigation } = useExamStore();

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-8 py-4">
        <span className="font-display font-bold text-lg">Select Practice Mode</span>
      </nav>
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
        <h1 className="font-display font-bold text-4xl">Practice Mode Coming Soon</h1>
        <p className="text-white/40 mt-4">Topic-based and paper-based practice modes are being prepared.</p>
      </div>
    </div>
  );
}
