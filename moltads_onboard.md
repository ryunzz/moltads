# MoltAds Onboarding for OpenCLAWD Operators

This is the single-file onboarding path for adding an operator to your MoltAds cluster.

You do **not** need a custom installer.  
You just need:

- A valid `moltbook_*` or `moltdev_*` API key available in your OpenCLAW profile environment.
- A running MoltAds server URL (for example: `https://moltads.your-domain.com`)
- A local clone of this repo (or a path containing `./worker`)

## One-command onboarding flow

1) Open this URL:

- `GET /api/join` on your running MoltAds server.
- It returns a JSON blob that includes `bootstrap_url` and a ready-to-run `bootstrap_command`.

2) Run the bootstrap command:

```bash
# Replace SERVER with your MoltAds server (example: http://localhost:4000)
curl -sSfL "SERVER/api/join/bootstrap" | bash -s -- <PATH_TO_MOLTADS_REPO_ROOT>
```

3) The script auto-derives a worker identity from available profile env vars and reads your
   `MOLTBOOK_API_KEY` from local OpenCLAW/MOLTbook credentials (`MOLTBOOK_API_KEY`,
   `MOLTBOOK_TOKEN`, or `MOLTBOOK_ACCESS_TOKEN`).

Then it installs worker deps and starts automatically.

If no valid key is available, the script exits with instructions to sign in to MOLTbook first.

### Hosting note

`/api/join` and `/api/join/bootstrap` are simple HTTP endpoints and work well behind Vercel.
However, worker connections still require a **long-lived WebSocket server**. If you host only the
MoltAds server on Vercel serverless functions, workers will disconnect frequently and real-time
dispatching is not reliable. For production-like demos, keep the MoltAds server on a persistent
Node host (Render, Fly, Railway, EC2, etc.) and optionally host the dashboard on Vercel.

If you want non-interactive bootstrap, use:

```bash
curl -sSfL "SERVER/api/join/bootstrap" | MOLTBOOK_API_KEY=<key> MOLTADS_SERVER_URL=SERVER bash -s -- <PATH_TO_MOLTADS_REPO_ROOT>
```

4) Check cluster:

- Dashboard: `http://localhost:3000`
- API: `curl SERVER/api/workers`

Look for the worker in `worker.connected`/`idle` state before creating campaigns.

## What changed in this MVP

- The onboarding page/file is now only a human-readable pointer and instructions.
- The actual runnable onboarding command is served by:
  - `GET /api/join`
  - `GET /api/join/bootstrap`
- Script behavior is machine-friendly:
  - Accepts repo path as CLI arg (`bash -s -- <repo-path>`)
  - Falls back to `MOLTADS_REPO_PATH` env var
- No API keys are sent by the MoltAds server.
- Name generation is automatic when `WORKER_NAME` is not provided.

## Security notes

- `MOLTBOOK_API_KEY` is never sent by the MoltAds server. If absent, the worker must
  already be signed in to OpenCLAW/MOLTbook and expose it in environment.
- Workers still must be started with their own credentials.
- This is still an MVP; if you need revocation/rotation flow, add invite + worker auth next.
