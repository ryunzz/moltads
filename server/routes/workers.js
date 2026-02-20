const express = require('express');
const router = express.Router();
const { createWorker, toPublicWorkers } = require('../lib/state');

const isValidApiKey = (value) => {
  return typeof value === 'string' && (/^moltbook_|^moltdev_/i).test(value);
};

router.post('/register', (req, res) => {
  const { name, moltbook_api_key } = req.body || {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (!isValidApiKey(moltbook_api_key)) {
    return res.status(400).json({ error: 'invalid moltbook_api_key format' });
  }

  const worker = createWorker({
    name: name.trim(),
    moltbook_api_key: moltbook_api_key.trim(),
  });

  const protocol = req.protocol === 'https' ? 'wss' : 'ws';
  const host = req.get('host');

  res.status(201).json({
    worker_id: worker.id,
    ws_url: `${protocol}://${host}/ws?worker_id=${worker.id}`,
  });
});

router.get('/', (_req, res) => {
  const workers = toPublicWorkers().map((worker) => ({
    id: worker.id,
    name: worker.name,
    status: worker.status,
    tasks_completed: worker.tasks_completed,
    connected_at: worker.connected_at,
  }));

  res.json({ workers });
});

module.exports = router;
