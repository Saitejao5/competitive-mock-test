import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import examRoutes from './routes/exam.js';
import sessionRoutes from './routes/session.js';
import { SessionStore } from './services/sessionStore.js';
import { handleWebSocket } from './services/wsHandler.js';
import { requestLogger } from './middleware/logger.js';

const app = express();
const httpServer = createServer(app);

// ── WebSocket Server ──────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  console.log(`\x1b[36m[WS]\x1b[0m Client connected: ${clientId}`);

  ws.clientId = clientId;
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => handleWebSocket(ws, data, wss));
  ws.on('close', () => {
    console.log(`\x1b[33m[WS]\x1b[0m Client disconnected: ${clientId}`);
  });
  ws.on('error', (err) => {
    console.error(`\x1b[31m[WS]\x1b[0m Error for ${clientId}:`, err.message);
  });

  // Send welcome
  ws.send(JSON.stringify({ type: 'connected', clientId, timestamp: new Date().toISOString() }));
});

// Heartbeat to detect dead connections
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

// ── Express Middleware ────────────────────────────────────
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(requestLogger);

// ── Routes ────────────────────────────────────────────────
app.use('/api/exam', examRoutes);
app.use('/api/session', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    sessions: SessionStore.count(),
    wsClients: wss.clients.size,
    models: {
      provider: 'OpenRouter',
      primary: process.env.OPENROUTER_PRIMARY_MODEL,
      fallback: process.env.OPENROUTER_FALLBACK_MODEL
    }
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`\x1b[31m[ERROR]\x1b[0m`, err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log('\n\x1b[35m╔══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║     AI EXAM ENGINE — BACKEND SERVER      ║\x1b[0m');
  console.log('\x1b[35m╚══════════════════════════════════════════╝\x1b[0m');
  console.log(`\x1b[32m[SERVER]\x1b[0m HTTP listening on http://localhost:${PORT}`);
  console.log(`\x1b[36m[WS]\x1b[0m    WebSocket on ws://localhost:${PORT}/ws`);
  console.log(`\x1b[34m[LLM]\x1b[0m   Provider: OpenRouter`);
  console.log(`\x1b[34m[LLM]\x1b[0m   Primary: ${process.env.OPENROUTER_PRIMARY_MODEL}`);
  console.log(`\x1b[34m[LLM]\x1b[0m   Fallback: ${process.env.OPENROUTER_FALLBACK_MODEL}`);
  console.log(`\x1b[33m[MEM]\x1b[0m   Session store: in-memory (zero-DB mode)\n`);
});
