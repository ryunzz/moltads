require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const { workers, campaigns } = require('./lib/state');
const { setupWebSocketServer } = require('./lib/websocket');
const { broadcast } = require('./lib/sse');
const workersRouter = require('./routes/workers');
const campaignsRouter = require('./routes/campaigns');
const activityRouter = require('./routes/activity');

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

if (process.env.DRY_RUN === 'true') {
  console.log('[DRY-RUN] MoltAds server is operating in dry run mode');
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    workers: workers.size,
    campaigns: campaigns.size,
  });
});

app.use('/api/workers', workersRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/activity', activityRouter);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setupWebSocketServer(wss, broadcast);

server.listen(PORT, () => {
  console.log(`MoltAds server running on http://localhost:${PORT}`);
  console.log(`SSE: /api/activity`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});
