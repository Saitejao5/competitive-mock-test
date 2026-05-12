# AI Exam Engine — Full Stack Setup

## Project Structure
```
exam-engine/
├── backend/          Node.js + Express + WebSocket
│   ├── src/
│   │   ├── index.js                 # Server entry point
│   │   ├── routes/
│   │   │   ├── exam.js              # REST exam routes
│   │   │   └── session.js           # Session REST routes
│   │   ├── services/
│   │   │   ├── llmRouter.js         # Multi-provider LLM orchestration
│   │   │   ├── questionGenerator.js # Prompt + validation + fallback
│   │   │   ├── sessionStore.js      # In-memory session management
│   │   │   └── wsHandler.js         # WebSocket message handler
│   │   ├── middleware/
│   │   │   └── logger.js            # Request logger
│   └── .env                         # API keys + config
│
└── frontend/         React + Vite + Tailwind + Zustand
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── store/
    │   │   └── examStore.js         # Zustand global state
    │   ├── hooks/
    │   │   ├── useWebSocket.js      # WS connection + message routing
    │   │   └── useTimer.js          # Exam countdown timer
    │   ├── components/
    │   │   ├── home/HomePage.jsx    # Config + launch screen
    │   │   ├── exam/
    │   │   │   ├── ExamPage.jsx     # Exam shell + layout
    │   │   │   ├── ExamSidebar.jsx  # Sections + Q-map + timer
    │   │   │   └── SectionView.jsx  # Questions + options + explanation
    │   │   ├── analysis/
    │   │   │   └── AnalysisPage.jsx # Deep post-exam analytics
    │   │   └── ui/
    │   │       └── ConsolePanel.jsx # Real-time log console
    │   └── styles/globals.css
    └── .env
```

## Quick Start

### 1. Add your API key
Edit `backend/.env`:
```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_PRIMARY_MODEL=openai/gpt-4o-mini
OPENROUTER_FALLBACK_MODEL=openai/gpt-4-turbo
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```
Server starts on http://localhost:3001
WebSocket on ws://localhost:3001/ws

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
App opens at http://localhost:5173

## How It Works

### Exam Flow
1. User configures exam (mode, paper, difficulty, sections, Q count)
2. Click "Generate & Start" → WebSocket sends `START_EXAM`
3. Backend generates Section 1 immediately (priority path)
4. Sections 2-N generated in parallel via `Promise.all`
5. Each section streamed to frontend via `SECTION_READY` WS event
6. User completes exam → `SUBMIT_EXAM` sent
7. Analytics computed client-side from session state

### LLM Router Priority
- **Primary**: OpenRouter with fallback models
- **Fallback**: Built-in offline questions (if API fails)

### Anti-Repetition
- Every question hashed (32-bit Bernstein hash on first 60 chars)
- Hash stored in session Set
- Duplicates rejected at validation layer
- Previous questions injected into LLM prompt

### Session Memory (Zero-DB)
- Node.js in-memory Map
- TTL: 2 hours (configurable via SESSION_TTL_MS)
- Auto-cleanup every 30 minutes
- Stores: questions, hashes, analytics, config

## Console Logs Legend
- 🔵 info — general events
- 🟢 success — successful operations
- 🟡 warn — warnings, fallbacks
- 🔴 error — failures
- 🟣 llm — LLM API calls
- 🩵 stream — LLM responses

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| PORT | 3001 | Server port |
| OPENROUTER_API_KEY | — | Required |
| OPENROUTER_PRIMARY_MODEL | openai/gpt-4o-mini | Primary LLM |
| OPENROUTER_FALLBACK_MODEL | openai/gpt-4-turbo | Fallback LLM |
| LLM_TIMEOUT_MS | 10000 | Per-request timeout |
| MAX_RETRIES | 2 | Retries per model |
| SESSION_TTL_MS | 7200000 | Session lifetime (2h) |
| ALLOWED_ORIGIN | http://localhost:5173 | CORS origin |
