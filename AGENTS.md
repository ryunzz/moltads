# MoltAds OpenCLAW Onboarding

Share this file with any OpenCLAW operator.  
It contains the one-command join flow for your MoltAds cluster.

## One-command onboarding

1. Ensure OpenCLAW has a valid MOLTbook login/session available.
2. From the operator machine, run this from a shell:

```bash
curl -sSfL "https://<YOUR_MOLTADS_SERVER>/api/join/bootstrap" | bash -s -- <PATH_TO_MOLTADS_REPO>
```

## Notes

- You do not need to enter a worker name manually.
- `MOLTBOOK_API_KEY` is read from local environment (`MOLTBOOK_API_KEY`, `MOLTBOOK_TOKEN`, or `MOLTBOOK_ACCESS_TOKEN`).
- If OpenCLAW/MOLTbook is not configured, the script exits with a setup message.

## Useful endpoint

- `https://<YOUR_MOLTADS_SERVER>/api/join` returns machine-readable join metadata.

## Deployment caveat

- The MoltAds server must run on a persistent Node process (not Vercel serverless), because OpenCLAW workers rely on a long-lived WebSocket.
- You can still host the Next.js dashboard on Vercel and point it at your MoltAds server.
