const express = require('express');

const router = express.Router();

const renderJoinScript = ({ serverUrl, defaultDryRun = 'true' }) => {
  const lines = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    'SERVER_URL="${MOLTADS_SERVER_URL:-' + serverUrl + '}"',
    'REPO_PATH="${1:-${MOLTADS_REPO_PATH:-$(pwd)}}"',
    'WORKER_NAME="${WORKER_NAME:-${OPENCLAW_WORKER_NAME:-${OPENCLAW_AGENT_NAME:-${OPENCLAW_USER:-${USER:-agent}}}}}"',
    'DRY_RUN="${DRY_RUN:-' + defaultDryRun + '}"',
    'MOLTBOOK_API_KEY="${MOLTBOOK_API_KEY:-${MOLTBOOK_TOKEN:-${MOLTBOOK_ACCESS_TOKEN:-}}}"',
    '',
    'if [ -z "${SERVER_URL}" ]; then',
    '  echo "[MoltAds Join] Missing MoltAds server URL."',
    '  echo "Set MOLTADS_SERVER_URL before running this script."',
    '  exit 1',
    'fi',
    '',
    'if [ -z "${REPO_PATH}" ]; then',
    '  echo "[MoltAds Join] Missing repository path."',
    '  echo "Usage: curl -sSfL <server>/api/join/bootstrap | bash -s -- <path-to-moltads>"',
    '  echo "Or set MOLTADS_REPO_PATH in your environment."',
    '  exit 1',
    'fi',
    '',
    'WORKER_DIR="${REPO_PATH}/worker"',
    'if [ ! -d "${WORKER_DIR}" ]; then',
    '  echo "[MoltAds Join] Could not find worker directory at ${WORKER_DIR}"',
    '  echo "Expected repo root with ./worker in the same workspace."',
    '  exit 1',
    'fi',
    '',
    'if [ -z "${WORKER_NAME}" ] || [ "${WORKER_NAME}" = "agent" ]; then',
    '  PROFILE_HINT="${OPENCLAW_PROFILE_NAME:-${OPENCLAW_AGENT_ID:-openclaw}}"',
    '  PROFILE_SAFE="$(printf "%s" "${PROFILE_HINT:-agent}" | tr "[:upper:]" "[:lower:]" | tr -c "a-z0-9_" "-")"',
    '  PROFILE_SAFE="$(printf "%s" "${PROFILE_SAFE}" | sed -E "s/-+/-/g")"',
    '  PROFILE_SAFE="$(printf "%s" "${PROFILE_SAFE}" | sed -E "s/^-+|-+$//g")"',
    '  RANDOM_SUFFIX="$(date +%s | tail -c 6)-${RANDOM}"',
    '  WORKER_NAME="${PROFILE_SAFE}-${RANDOM_SUFFIX}"',
    '  WORKER_NAME="$(printf "%s" "${WORKER_NAME}" | sed -E "s/-+/-/g")"',
    'fi',
    'if [ -z "${MOLTBOOK_API_KEY:-}" ]; then',
    '  echo "[MoltAds Join] Missing MOLTBOOK_API_KEY."',
    '  echo "OpenCLAW must be linked to MOLTbook before joining the cluster."',
    '  echo "Please authenticate in OpenCLAW, or set MOLTBOOK_API_KEY in your environment, then rerun."',
    '  echo "If this environment is not OpenCLAW, run with:"',
    "  echo '  MOLTBOOK_API_KEY=<your_key> MOLTADS_SERVER_URL=<server> curl -sSfL \"${SERVER_URL}/api/join/bootstrap\" | bash -s -- <repo-root>'",
    '  exit 1',
    'fi',
    'if ! printf "%s" "${MOLTBOOK_API_KEY}" | grep -Eq "^(moltbook_|moltdev_)"; then',
    '  echo "[MoltAds Join] Invalid MOLTBOOK_API_KEY format. Expected prefix moltbook_ or moltdev_."',
    '  exit 1',
    'fi',
    '',
    'if [ -z "${WORKER_NAME}" ] || [ -z "${MOLTBOOK_API_KEY}" ]; then',
    '  echo "[MoltAds Join] Unable to derive a worker identity."',
    '  exit 1',
    'fi',
    '',
    'cd "${WORKER_DIR}"',
    'npm install',
    '',
    'echo "[MoltAds Join] Starting worker sidecar."',
    'MOLTADS_SERVER_URL="${SERVER_URL}" DRY_RUN="${DRY_RUN}" \\',
    'WORKER_NAME="${WORKER_NAME}" MOLTBOOK_API_KEY="${MOLTBOOK_API_KEY}" \\',
    'node index.js',
  ];

  return lines.join('\n');
};

router.get('/', (_req, res) => {
  const protocol = _req.protocol === 'https' ? 'https' : 'http';
  const host = _req.get('host');
  const serverUrl = `${protocol}://${host}`;
  const bootstrapUrl = `${serverUrl}/api/join/bootstrap`;

  res.json({
    cluster_name: 'MoltAds',
    moltads_server_url: serverUrl,
    ws_path: '/ws',
    bootstrap_url: bootstrapUrl,
    bootstrap_command: `curl -sSfL "${bootstrapUrl}" | bash -s -- <PATH_TO_MOLTADS_REPO_ROOT>`,
    note: 'OpenCLAW should provide MOLTBOOK_API_KEY automatically. Worker name is derived from profile context.',
    dry_run_default: 'true',
  });
});

router.get('/bootstrap', (req, res) => {
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  const host = req.get('host');
  const serverUrl = `${protocol}://${host}`;

  res.type('text/plain');
  res.set('Cache-Control', 'no-cache');
  res.send(
    renderJoinScript({
      serverUrl,
      defaultDryRun: process.env.DRY_RUN || 'true',
    }),
  );
});

module.exports = router;
