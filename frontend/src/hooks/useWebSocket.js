import { useEffect, useRef, useCallback } from 'react';
import { useExamStore } from '../store/examStore';

const WS_URL = 'ws://localhost:3001/ws';

export function useWebSocket() {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const { setWsStatus, addLog, setSectionStatus, setSectionReady, setSessionId, initSections, setPage, startExamTimer } = useExamStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus('connecting');
    addLog('Connecting to WebSocket server...', 'info');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsStatus('connected');
      addLog('WebSocket connected — real-time channel ready', 'success');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    };

    ws.onclose = (e) => {
      setWsStatus('disconnected');
      addLog(`WebSocket disconnected (code: ${e.code})`, 'warn');
      // Auto-reconnect after 3s
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      setWsStatus('error');
      addLog('WebSocket error — check if backend is running on :3001', 'error');
    };
  }, []);

  const handleMessage = (msg) => {
    console.log('[WS ←]', msg.type, msg);

    switch (msg.type) {
      case 'connected':
        addLog(`[WS] Client ID: ${msg.clientId}`, 'info');
        break;

      case 'EXAM_STARTED':
        addLog(`[SESSION] Created: ${msg.sessionId}`, 'success');
        addLog(`[CONFIG] ${msg.config.exam} | ${msg.config.difficulty} | ${msg.totalSections} sections`, 'info');
        setSessionId(msg.sessionId);
        initSections(msg.config.sections);
        startExamTimer();
        setPage('exam');
        break;

      case 'SECTION_GENERATING':
        addLog(`[GEN] Section "${msg.sectionName}" generating... (index ${msg.sectionIndex})`, 'llm');
        setSectionStatus(msg.sectionIndex, 'generating');
        break;

      case 'SECTION_READY':
        addLog(`[GEN ✓] "${msg.sectionName}" ready — ${msg.questions.length} questions`, 'success');
        setSectionReady(msg.sectionIndex, msg.questions);
        break;

      case 'SECTION_ERROR':
        addLog(`[GEN ✗] "${msg.sectionName}" failed: ${msg.error}`, 'error');
        setSectionStatus(msg.sectionIndex, 'error');
        break;

      case 'ALL_SECTIONS_READY':
        addLog('[GEN ✓] All sections ready — full exam available', 'success');
        break;

      case 'LOG':
        addLog(msg.message, msg.logType || 'info');
        break;

      case 'PONG':
        break;

      case 'error':
        addLog(`[WS ERROR] ${msg.message}`, 'error');
        break;

      default:
        console.log('[WS] Unhandled message:', msg.type);
    }
  };

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
      console.log('[WS →]', type, payload);
    } else {
      addLog(`Cannot send "${type}" — WebSocket not connected`, 'warn');
    }
  }, []);

  const startExam = useCallback((config) => {
    addLog(`[ORCHESTRATOR] Initiating exam: ${config.exam} | ${config.difficulty}`, 'llm');
    addLog(`[ORCHESTRATOR] Sections: ${config.sections.join(', ')}`, 'info');
    send('START_EXAM', { config });
  }, [send]);

  const submitExam = useCallback((sessionId, answers, timings) => {
    addLog('[SUBMIT] Sending exam answers to server...', 'info');
    send('SUBMIT_EXAM', { sessionId, answers, timings });
  }, [send]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  return { send, startExam, submitExam };
}
