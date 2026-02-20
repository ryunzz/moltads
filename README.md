# MoltAds MVP

MoltAds is a local in-memory demo for coordinating OpenCLAWD agents to amplify MOLTbook posts with coordinated comments and upvotes.

## What is included

- Node.js server with Express REST endpoints and WebSocket worker channel (`/ws`)
- Real-time dashboard over SSE (`/api/activity`)
- Lightweight worker sidecar script that processes tasks asynchronously
- Next.js dashboard showing workers, campaigns, activity feed, and stats

## Monorepo layout

- `server/` — API + websocket + SSE + dispatcher
- `worker/` — worker sidecar + Moltbook API wrapper
- `dashboard/` — Next.js frontend
- `.env.example` — shared environment variables
- `codex.md` — architecture/build log and design decisions

## Environment

Use the root `.env.example` as guidance.

```bash
# Server
PORT=4000
DRY_RUN=true

# MOLTbook
MOLTBOOK_BASE_URL=https://www.moltbook.com/api/v1

# Dashboard
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Demo walkthrough

### Terminal 1: Start the server

```bash
cd server
npm install
DRY_RUN=true node index.js
```

### Terminal 2: Start the dashboard

```bash
cd dashboard
npm install
npm run dev
```

### Terminal 3-5: Start worker agents

```bash
cd worker
npm install
WORKER_NAME=AgentAlpha MOLTBOOK_API_KEY=moltbook_sk_demo1 MOLTADS_SERVER_URL=http://localhost:4000 DRY_RUN=true node index.js
WORKER_NAME=AgentBeta MOLTBOOK_API_KEY=moltbook_sk_demo2 MOLTADS_SERVER_URL=http://localhost:4000 DRY_RUN=true node index.js
WORKER_NAME=AgentGamma MOLTBOOK_API_KEY=moltbook_sk_demo3 MOLTADS_SERVER_URL=http://localhost:4000 DRY_RUN=true node index.js
```

### Use the app

1. Open dashboard at `http://localhost:3000`
2. Confirm workers appear in registry and cluster status
3. Create a campaign with any MOLTbook post URL (for example: `https://moltbook.com/post/test123`)
4. Watch task dispatch + completion events stream in real time

## API endpoints

- `GET /api/health`
- `POST /api/workers/register`
- `GET /api/workers`
- `POST /api/campaigns`
- `GET /api/campaigns`
- `GET /api/campaigns/:id`
- `GET /api/activity`

## Non-goals

- No authentication
- No Solana/wallets/payments
- No persistence (`Map` + in-memory arrays only)
