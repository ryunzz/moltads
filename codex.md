# MoltAds — Codex Build Log

## Step 1: Server Core
**Status:** ✅ Complete
**What was built:** Express server bootstrapping with CORS/JSON middleware, HTTP server on `PORT`, WebSocket server on `/ws`, dotenv loading, and `/api/health` endpoint.
**Design decisions:**
- Chose `ws` for transport instead of `socket.io` to keep protocol and lifecycle simple for MVP and easier interoperability with the sidecar worker.
  - Trade-off: no built-in rooms/reconnect helpers; reconnect logic remains explicit in worker.
  - Alternative: `socket.io` would provide automatic reconnection and better diagnostics but adds a heavier abstraction layer.
- Chose a single Node HTTP server for both REST and WS so ports stay aligned and deployment stays minimal.
  - Trade-off: combined lifecycle means one place to monitor and restart.
  - Alternative: split ports/processes for REST and WS for strict isolation.
- Kept state in module-level structures to satisfy no-database constraint.
  - Trade-off: data resets on restart.
  - Alternative: swap in durable storage by rewriting only `server/lib/state.js`.
**If you want to change this:** modify `server/index.js` (server startup), with related in-memory defaults in `server/lib/state.js`.

## Step 2: Worker Registration API
**Status:** ✅ Complete
**What was built:** `POST /api/workers/register`, `GET /api/workers`, key and naming validation, and worker objects stored in-memory.
**Design decisions:**
- Return WebSocket URL using request protocol/host to stay compatible with localhost and HTTPS proxying.
  - Trade-off: server determines URL from inbound headers, requiring correct proxy headers in fronted deployments.
  - Alternative: explicit environment-based advertised origin config.
- Kept API key out of list responses using a public-safe transform in state.
  - Trade-off: no way to audit key usage from dashboard payloads.
  - Alternative: add admin-only route for key management, not suitable for this MVP.
**If you want to change this:** modify `server/routes/workers.js` and `server/lib/state.js`.

## Step 3: WebSocket Handler
**Status:** ✅ Complete
**What was built:** Worker connection lifecycle on `/ws`, incoming task result/failure processing, ping/pong handling, status transitions, and activity event production.
**Design decisions:**
- Used direct `ws` event handlers (`message`, `close`, `error`) instead of external queue middleware.
  - Trade-off: all business events are processed inline on socket thread.
  - Alternative: queue/event bus layer per event type for larger scale workloads.
- Updated worker status using `activeTaskCount` so worker can become idle only when all in-flight tasks complete.
  - Trade-off: simple counter can become inconsistent if workers disappear during long tasks.
  - Alternative: per-task heartbeat acknowledgement and reclaim logic.
- Mark campaign completed once all tasks are done by checking final task states in websocket handler.
  - Trade-off: completion depends on task callbacks arriving.
  - Alternative: central scheduler state machine that includes timeout-based transitions.
**If you want to change this:** modify `server/lib/websocket.js` only.

## Step 4: Campaign API + Dispatcher
**Status:** ✅ Complete
**What was built:** Campaign create/list/detail endpoints, post ID extraction, round-robin task creation with per-worker comment/upvote caps, staggered WS task dispatch, and campaign life-cycle status handling.
**Design decisions:**
- Enforced per-campaign caps (1 comment + 1 upvote per worker) during assignment by tracking usage map.
  - Trade-off: strict cap can limit throughput if few workers are available.
  - Alternative: cap lifts could be configured per campaign but this would require only dispatcher edits.
- Used randomized 2–8 second intervals with `setTimeout` per-task scheduling.
  - Trade-off: dispatch latency may accumulate when campaign is small but acceptable for demo realism.
  - Alternative: queue tick loop or cron-like pacing to tune burst shape.
- Campaign assignment uses currently connected idle workers with active sockets only.
  - Trade-off: excludes registered-but-disconnected workers, reducing utilization after reconnect lag.
  - Alternative: queue for reconnect recovery, which touches dispatcher and websocket modules.
**If you want to change this:** modify `server/routes/campaigns.js` and `server/lib/dispatcher.js`.

## Step 5: SSE Broadcaster
**Status:** ✅ Complete
**What was built:** Connected SSE client set, `/api/activity` streaming endpoint, and event broadcasting helper used for worker/campaign/task lifecycle updates.
**Design decisions:**
- SSE uses plain event framing (`data:` lines) with JSON payloads and no custom event names.
  - Trade-off: no typed event multiplexing beyond payload `type` field.
  - Alternative: named events (`res.write('event: ...')`) if frontend needs subscribe-by-type semantics.
- Broadcast writes directly to all clients on each event; removes client on disconnect.
  - Trade-off: linear fanout per event.
  - Alternative: pub/sub broker integration if client count grows.
**If you want to change this:** modify `server/lib/sse.js` and `server/routes/activity.js`.

## Step 6: Worker Script
**Status:** ✅ Complete
**What was built:** Sidecar worker with register/WS connect loop, non-blocking task handling, exponential reconnect, dry-run mode, and MOLTbook client wrapper usage.
**Design decisions:**
- Kept worker loop passive and event-driven (`ws.on('message')`) and spawned async IIFE per task.
  - Trade-off: errors are per-task and surfaced as result/failure frames, not centralized.
  - Alternative: internal worker queue with bounded concurrency.
- Backoff strategy is capped exponential delay with `1s,2s,4s,8s...30s`.
  - Trade-off: temporary outages can pause processing longer than needed after the first minute.
  - Alternative: jittered exponential or server-driven heartbeat reconnect.
- Dry-run mode returns fake success with delayed completion and generated comment templates to keep dashboard behavior identical.
  - Trade-off: non-deterministic template selection can make visual validation varied.
  - Alternative: deterministic templates per post for strict reproducibility.
**If you want to change this:** modify `worker/index.js` and `worker/moltbook-client.js`.

## Step 7: Dashboard
**Status:** ✅ Complete
**What was built:** Next.js App Router dashboard with all required components and unique `moltads-*` identifiers, polling + SSE ingestion, activity feed, campaign list, worker registry, and stats cards.
**Design decisions:**
- Chose a dark theme in Slate/Cyan with motion classes for pulse and slide-down to keep live status obvious while avoiding heavy animation.
  - Trade-off: motion is visually present but lightweight for CPU budget.
  - Alternative: richer animation library if interaction polish is extended.
- Used polling for `/api/workers` and `/api/campaigns` with 3-second cadence.
  - Trade-off: up to 3 seconds delay for some non-SSE data.
  - Alternative: migrate workers/campaigns to SSE too, but this stays explicit and simple.
- Enforced per-element unique IDs/classes so external tooling can target each node reliably.
  - Trade-off: verbose markup and repetition.
  - Alternative: generated component helper, not needed for MVP.
**If you want to change this:** modify the corresponding component files under `dashboard/app/components`, hooks in `dashboard/app/hooks`, and types in `dashboard/app/lib/types.ts`.
