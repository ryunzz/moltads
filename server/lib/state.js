const { randomUUID } = require('crypto');

const workers = new Map();
const campaigns = new Map();
const tasks = new Map();
const activityLog = [];
const MAX_ACTIVITY_LOG = 500;

const now = () => new Date().toISOString();

const sanitizeWorker = (worker) => {
  const { moltbook_api_key, ws, ...publicWorker } = worker;
  return publicWorker;
};

const toPublicWorkers = () => Array.from(workers.values()).map(sanitizeWorker);

const createWorker = ({ name, moltbook_api_key }) => {
  const workerId = `w_${randomUUID()}`;
  const worker = {
    id: workerId,
    name,
    moltbook_api_key,
    status: 'registered',
    tasks_completed: 0,
    connected_at: null,
    registered_at: now(),
    activeTaskCount: 0,
    ws: null,
    last_seen_at: null,
  };

  workers.set(workerId, worker);

  return worker;
};

const createCampaign = ({ post_url, post_id, num_comments, num_upvotes }) => {
  const campaignId = `c_${randomUUID()}`;

  const campaign = {
    id: campaignId,
    post_url,
    post_id,
    num_comments,
    num_upvotes,
    tasks_total: 0,
    tasks_completed: 0,
    tasks_failed: 0,
    status: 'created',
    created_at: now(),
    started_at: null,
    completed_at: null,
    workers_available: 0,
    tasks: [],
  };

  campaigns.set(campaignId, campaign);
  return campaign;
};

const createTask = ({ campaign_id, worker_id, action, post_id, post_url }) => {
  const taskId = `t_${randomUUID()}`;
  const task = {
    task_id: taskId,
    campaign_id,
    worker_id,
    action,
    post_id,
    post_url,
    status: 'pending',
    created_at: now(),
    dispatched_at: null,
    completed_at: null,
    result: null,
    error: null,
  };

  tasks.set(taskId, task);
  const campaign = campaigns.get(campaign_id);
  if (campaign) {
    campaign.tasks.push(task);
    campaign.tasks_total += 1;
  }

  return task;
};

const findTask = (taskId) => tasks.get(taskId);

const updateTask = (taskId, patch = {}) => {
  const task = tasks.get(taskId);
  if (!task) return null;

  const previousStatus = task.status;
  Object.assign(task, patch);

  const campaign = campaigns.get(task.campaign_id);
  if (campaign) {
    if (patch.status === 'completed' && previousStatus !== 'completed') {
      campaign.tasks_completed += 1;
    }
    if (patch.status === 'failed' && previousStatus !== 'failed') {
      campaign.tasks_failed += 1;
    }
  }

  return task;
};

const updateTaskStatus = (taskId, status, patch = {}) => {
  return updateTask(taskId, { status, ...patch });
};

const setTaskResult = (taskId, result) => {
  return updateTask(taskId, { result, status: 'completed', completed_at: now() });
};

const setTaskError = (taskId, error) => {
  return updateTask(taskId, { error, status: 'failed', completed_at: now() });
};

const workerById = (workerId) => workers.get(workerId);
const campaignById = (campaignId) => campaigns.get(campaignId);

const allWorkers = () => toPublicWorkers();
const allCampaigns = () => Array.from(campaigns.values());
const allTasks = () => Array.from(tasks.values());

const hasActiveTasks = (campaignId) => {
  const campaign = campaigns.get(campaignId);
  if (!campaign) return false;
  return campaign.tasks.some((task) => task.status === 'pending' || task.status === 'dispatched');
};

const isCampaignDone = (campaignId) => {
  const campaign = campaigns.get(campaignId);
  if (!campaign) return false;
  return campaign.tasks.every((task) => task.status === 'completed' || task.status === 'failed');
};

const failOutstandingWorkerTasks = (workerId) => {
  for (const task of tasks.values()) {
    if (task.worker_id !== workerId) {
      continue;
    }

    if (task.status === 'completed' || task.status === 'failed') {
      continue;
    }

    task.status = 'failed';
    task.error = 'Worker disconnected';
    task.completed_at = now();

    const campaign = campaigns.get(task.campaign_id);
    if (campaign) {
      campaign.tasks_failed += 1;
    }
  }
};

const setWorkerConnected = (workerId, ws) => {
  const worker = workers.get(workerId);
  if (!worker) return null;

  worker.status = 'idle';
  worker.ws = ws;
  worker.connected_at = now();
  worker.last_seen_at = now();
  return worker;
};

const setWorkerDisconnected = (workerId) => {
  const worker = workers.get(workerId);
  if (!worker) return null;

  worker.status = 'offline';
  worker.ws = null;
  worker.last_seen_at = now();
  worker.activeTaskCount = Math.max(0, worker.activeTaskCount || 0);
  worker.activeTaskCount = 0;
  failOutstandingWorkerTasks(workerId);
  return worker;
};

const incrementWorkerTasks = (workerId, delta = 1) => {
  const worker = workers.get(workerId);
  if (!worker) return null;

  worker.tasks_completed += delta;
  return worker;
};

const beginTaskForWorker = (workerId) => {
  const worker = workers.get(workerId);
  if (!worker) return null;
  worker.activeTaskCount = (worker.activeTaskCount || 0) + 1;
  worker.status = 'busy';
  worker.last_seen_at = now();
  return worker;
};

const endTaskForWorker = (workerId) => {
  const worker = workers.get(workerId);
  if (!worker) return null;
  worker.activeTaskCount = Math.max(0, (worker.activeTaskCount || 0) - 1);
  if (worker.activeTaskCount === 0 && worker.status !== 'offline') {
    worker.status = 'idle';
  }
  worker.last_seen_at = now();
  return worker;
};

const addActivity = (event) => {
  const activity = {
    event_id: `e_${randomUUID()}`,
    timestamp: now(),
    ...event,
  };

  activityLog.push(activity);
  if (activityLog.length > MAX_ACTIVITY_LOG) {
    activityLog.shift();
  }

  return activity;
};

const getActivityLog = () => [...activityLog];

module.exports = {
  workers,
  campaigns,
  tasks,
  activityLog,
  sanitizeWorker,
  toPublicWorkers,
  createWorker,
  createCampaign,
  createTask,
  findTask,
  updateTask,
  updateTaskStatus,
  setTaskResult,
  setTaskError,
  workerById,
  campaignById,
  allWorkers,
  allCampaigns,
  allTasks,
  hasActiveTasks,
  isCampaignDone,
  failOutstandingWorkerTasks,
  setWorkerConnected,
  setWorkerDisconnected,
  incrementWorkerTasks,
  beginTaskForWorker,
  endTaskForWorker,
  addActivity,
  getActivityLog,
};
