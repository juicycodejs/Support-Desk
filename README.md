# AnomalyGuard AI — Multimodal E-Commerce Support Desk

A production-grade, real-time AI support desk that uses **Gemini 2.5 Flash** vision to automatically triage customer tickets, classify issues, score sentiment, and draft responses — all streamed live to agent dashboards via **Socket.io**.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite, Socket.io Client |
| Backend | Node.js, Express, TypeScript, Socket.io, Multer |
| AI | Google Gemini 2.5 Flash (multimodal — text + vision) |
| Database | PostgreSQL via Prisma ORM |
| Observability | Langfuse (LLM tracing, latency, token costs) |

## Architecture

```
Customer Portal → REST POST /api/tickets (multipart image upload)
    → Prisma saves ticket to PostgreSQL
    → Socket.io emits ticket:created to all agents
    → Gemini 2.5 Flash runs async vision analysis
    → Structured JSON (category, priority, draft, sentiment)
    → Langfuse logs trace with latency + token metadata
    → Socket.io emits ticket:queued with full AI payload
    → Agent Dashboard updates live — zero page refresh
```

## Getting Started

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- Gemini API key ([Google AI Studio](https://aistudio.google.com))
- (Optional) Langfuse account for tracing

### 2. Backend Setup

```bash
cd backend
npm install

# Copy and fill in your credentials
cp .env.example .env

# Push schema to database
npm run db:push

# Start dev server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Open

- **Customer Portal**: http://localhost:3000
- **Agent Dashboard**: http://localhost:3000/agent

## Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/support_desk_db"
GEMINI_API_KEY="your-key"
LANGFUSE_PUBLIC_KEY="pk-..."
LANGFUSE_SECRET_KEY="sk-..."
LANGFUSE_HOST="https://cloud.langfuse.com"
PORT=4000
```

## Key Features

- **Multimodal AI Triage** — Upload a photo of damaged packaging; Gemini describes the damage, classifies the issue, and sets priority automatically
- **Real-time Agent Queue** — Socket.io pushes every state change live; agents see new tickets appear and update without refreshing
- **AI Reply Improvement** — Agents type a rough draft; one click sends it through Gemini for polishing before sending
- **Sentiment Scoring** — Each ticket gets a 1–10 sentiment score so agents can prioritize distressed customers
- **Production Telemetry** — Every AI call is traced in Langfuse with latency, token counts, and input/output logging
- **Stats Dashboard** — Live breakdown of tickets by status, priority, and category

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/tickets` | Create ticket (multipart with optional image) |
| GET | `/api/tickets` | List tickets with filters + pagination |
| GET | `/api/tickets/stats` | Aggregate stats |
| GET | `/api/tickets/:id` | Get ticket with full message history |
| PATCH | `/api/tickets/:id` | Update status/priority/assignee |
| POST | `/api/tickets/:id/improve-reply` | AI-polish an agent's draft reply |

## WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `ticket:created` | Server → Client | New ticket object |
| `ticket:queued` | Server → Client | AI-enriched ticket + draft + sentiment |
| `ticket:updated` | Server → Client | Updated ticket |
| `message:received` | Server → Room | New message |
| `message:send` | Client → Server | `{ ticketId, text, sender }` |
| `ticket:resolve` | Client → Server | `ticketId` |
| `room:join` | Client → Server | `ticketId` |
