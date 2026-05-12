import React, { useEffect, useRef } from 'react';
import { useExamStore } from '../../store/examStore';

const TYPE_STYLES = {
  info:    'text-sky-exam',
  success: 'text-emerald-exam',
  warn:    'text-gold',
  error:   'text-flame',
  llm:     'text-violet-soft',
  stream:  'text-cyan-400'
};

const TYPE_BG = {
  info:    'bg-sky-exam/5',
  success: 'bg-emerald-exam/5',
  warn:    'bg-gold/5',
  error:   'bg-flame/5',
  llm:     'bg-violet/5',
  stream:  'bg-cyan-400/5'
};

export default function ConsolePanel({ maxHeight = '220px' }) {
  const logs = useExamStore(s => s.logs);
  const wsStatus = useExamStore(s => s.wsStatus);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-flame/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-gold/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-exam/60" />
          </div>
          <span className="text-xs font-mono text-white/30 ml-1">System Console — Real-time LLM Logs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${wsStatus === 'connected' ? 'text-emerald-exam' : wsStatus === 'connecting' ? 'text-gold' : 'text-flame'}`}>
            {wsStatus === 'connected' ? '● LIVE' : wsStatus === 'connecting' ? '◌ CONNECTING' : '○ OFFLINE'}
          </span>
          <span className="text-xs font-mono text-white/20">{logs.length} events</span>
        </div>
      </div>

      {/* Log area */}
      <div className="overflow-y-auto p-3 space-y-0.5" style={{ maxHeight }}>
        {logs.length === 0 && (
          <p className="text-xs font-mono text-white/20 py-4 text-center">Waiting for events...</p>
        )}
        {logs.map(log => (
          <div key={log.id} className={`flex gap-3 px-2 py-1 rounded text-xs font-mono ${TYPE_BG[log.logType] || ''} group`}>
            <span className="text-white/20 shrink-0">{log.ts}</span>
            <span className={TYPE_STYLES[log.logType] || 'text-white/50'}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
