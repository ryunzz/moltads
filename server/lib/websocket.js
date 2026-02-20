const {
  workerById,
  setWorkerConnected,
  setWorkerDisconnected,
  findTask,
  setTaskResult,
  setTaskError,
  incrementWorkerTasks,
  endTaskForWorker,
  isCampaignDone,
  campaignById,
  addActivity,
  tasks,
} = require('./state');
const { OPEN } = require('ws');

const isKnownTask = (task) => typeof task === 'object' && task !== null;

const safeSend = (ws, data) => {
  if (!ws || ws.readyState !== OPEN) return;
  ws.send(JSON.stringify(data));
};

const markCampaignIfDone = (campaign, broadcast) => {
  if (!campaign || !isCampaignDone(campaign.id) || campaign.status === 'completed') {
    return;
  }

  campaign.status = 'completed';
  campaign.completed_at = new Date().toISOString();

  const event = addActivity({
    type: 'campaign_completed',
    campaign_id: campaign.id,
    post_url: campaign.post_url,
    total_comments: campaign.tasks.filter((task) => task.action === 'comment').length,
    total_upvotes: campaign.tasks.filter((task) => task.action === 'upvote').length,
    duration_ms: campaign.started_at && campaign.completed_at ? new Date(campaign.completed_at).getTime() - new Date(campaign.started_at).getTime() : 0,
  });

  broadcast(event);
};

const setupWebSocketServer = (wss, broadcast) => {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', 'ws://localhost');
    const workerId = url.searchParams.get('worker_id');

    if (!workerId) {
      ws.close(1008, 'Missing worker_id');
      return;
    }

    const worker = workerById(workerId);
    if (!worker) {
      ws.close(1008, 'Invalid worker_id');
      return;
    }

    setWorkerConnected(workerId, ws);
    const connectedEvent = addActivity({
      type: 'worker_connected',
      worker_id: workerId,
      worker_name: worker.name,
    });
    broadcast(connectedEvent);

    ws.on('message', (data) => {
      let payload = null;
      try {
        payload = JSON.parse(data.toString('utf8'));
      } catch (err) {
        console.warn('[WebSocket] Malformed JSON from worker', workerId, err.message);
        return;
      }

      if (!payload || typeof payload !== 'object') {
        return;
      }

      if (payload.type === 'ping') {
        safeSend(ws, { type: 'pong' });
        return;
      }

      if (payload.type === 'task_complete') {
        const { task_id, result = {} } = payload;
        const task = findTask(task_id);
        if (!isKnownTask(task)) {
          console.warn('[WebSocket] Unknown task completion:', task_id);
          return;
        }

        const completedTask = setTaskResult(task_id, {
          comment_id: result.comment_id || null,
          content: result.content || null,
        });
        if (!completedTask) {
          return;
        }

        incrementWorkerTasks(task.worker_id);
        endTaskForWorker(task.worker_id);

        const campaign = campaignById(task.campaign_id);
        const completedEvent = addActivity({
          type: 'task_completed',
          campaign_id: task.campaign_id,
          task_id: task.task_id,
          worker_id: task.worker_id,
          worker_name: workerById(task.worker_id)?.name,
          action: task.action,
          comment_id: result.comment_id || null,
          comment_content: result.content || null,
        });
        broadcast(completedEvent);
        markCampaignIfDone(campaign, broadcast);
        return;
      }

      if (payload.type === 'task_failed') {
        const { task_id, error } = payload;
        const task = findTask(task_id);
        if (!isKnownTask(task)) {
          console.warn('[WebSocket] Unknown task failure:', task_id);
          return;
        }

        const failedTask = setTaskError(task_id, error || 'Unknown error');
        if (!failedTask) {
          return;
        }

        endTaskForWorker(task.worker_id);
        const campaign = campaignById(task.campaign_id);
        const failedEvent = addActivity({
          type: 'task_failed',
          campaign_id: task.campaign_id,
          task_id: task.task_id,
          worker_id: task.worker_id,
          worker_name: workerById(task.worker_id)?.name,
          action: task.action,
          error: error || 'Unknown error',
        });
        broadcast(failedEvent);
        markCampaignIfDone(campaign, broadcast);
        return;
      }

      console.warn('[WebSocket] Unknown message type from worker:', payload.type);
    });

    ws.on('close', () => {
      const offlineWorker = setWorkerDisconnected(workerId);
      if (offlineWorker) {
        const impactedCampaignIds = new Set();
        for (const task of tasks.values()) {
          if (task.worker_id === workerId && task.status === 'failed') {
            impactedCampaignIds.add(task.campaign_id);
          }
        }

        const disconnectedEvent = addActivity({
          type: 'worker_disconnected',
          worker_id: workerId,
          worker_name: offlineWorker.name,
        });
        broadcast(disconnectedEvent);

        for (const campaignId of impactedCampaignIds.values()) {
          markCampaignIfDone(campaignById(campaignId), broadcast);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Worker socket error', workerId, error.message);
    });
  });
};

module.exports = {
  setupWebSocketServer,
};
