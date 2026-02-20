const {
  createTask,
  workerById,
  campaignById,
  isCampaignDone,
  updateTask,
  beginTaskForWorker,
  addActivity,
} = require('./state');

const now = () => new Date().toISOString();

const assignTasksRoundRobin = ({ campaign, workersSource = [], numComments, numUpvotes }) => {
  const campaignRef = campaignById(campaign.id);
  if (!campaignRef) {
    return {
      tasks: [],
      workersAvailable: 0,
      assignedComments: 0,
      assignedUpvotes: 0,
    };
  }

  const workers = Array.from(workersSource.values()).filter(
    (worker) => worker && worker.status === 'idle' && worker.ws,
  );

  campaignRef.workers_available = workers.length;

  if (!workers.length || (numComments === 0 && numUpvotes === 0)) {
    return {
      tasks: [],
      workersAvailable: workers.length,
      assignedComments: 0,
      assignedUpvotes: 0,
    };
  }

  const usage = new Map();
  let nextWorkerIndex = 0;

  const chooseNext = (action) => {
    if (!workers.length) {
      return null;
    }

    let rounds = 0;
    while (rounds < workers.length * 2) {
      const worker = workers[nextWorkerIndex % workers.length];
      const workerUsage = usage.get(worker.id) || { comment: 0, upvote: 0 };
      nextWorkerIndex += 1;
      rounds += 1;

      if (!workerUsage[action]) {
        workerUsage[action] = 1;
        usage.set(worker.id, workerUsage);
        return worker.id;
      }

      if (workerUsage.comment >= 1 && workerUsage.upvote >= 1) {
        continue;
      }
    }

    return null;
  };

  const assigned = [];
  let assignedComments = 0;
  let assignedUpvotes = 0;

  for (let i = 0; i < numComments; i += 1) {
    const workerId = chooseNext('comment');
    if (!workerId) {
      break;
    }
    const task = createTask({
      campaign_id: campaign.id,
      worker_id: workerId,
      action: 'comment',
      post_id: campaign.post_id,
      post_url: campaign.post_url,
    });

    task.context = {
      submolt: 'general',
      title: `Post ${campaign.post_id}`,
    };

    assigned.push(task);
    assignedComments += 1;
  }

  for (let i = 0; i < numUpvotes; i += 1) {
    const workerId = chooseNext('upvote');
    if (!workerId) {
      break;
    }
    const task = createTask({
      campaign_id: campaign.id,
      worker_id: workerId,
      action: 'upvote',
      post_id: campaign.post_id,
      post_url: campaign.post_url,
    });

    assigned.push(task);
    assignedUpvotes += 1;
  }

  return {
    tasks: assigned,
    workersAvailable: workers.length,
    assignedComments,
    assignedUpvotes,
  };
};

const dispatchTasks = (campaign, broadcast = () => undefined) => {
  const campaignRef = campaignById(campaign.id);
  if (!campaignRef) {
    return;
  }

  const tasks = campaignRef.tasks || [];
  campaignRef.status = tasks.length ? 'dispatching' : 'completed';
  campaignRef.started_at = now();

  if (!tasks.length) {
    campaignRef.completed_at = now();
    const completeEvent = addActivity({
      type: 'campaign_completed',
      campaign_id: campaignRef.id,
      post_url: campaignRef.post_url,
      total_comments: campaignRef.tasks.filter((task) => task.action === 'comment').length,
      total_upvotes: campaignRef.tasks.filter((task) => task.action === 'upvote').length,
      duration_ms: 0,
    });
    broadcast(completeEvent);
    return;
  }

  let index = 0;

  const finalizeCampaignIfDone = (campaignRef) => {
    if (!campaignRef) {
      return;
    }

    if (campaignRef.status === 'completed' || !isCampaignDone(campaignRef.id)) {
      return;
    }

    campaignRef.status = 'completed';
    campaignRef.completed_at = now();

    const completeEvent = addActivity({
      type: 'campaign_completed',
      campaign_id: campaignRef.id,
      post_url: campaignRef.post_url,
      total_comments: campaignRef.tasks.filter((task) => task.action === 'comment').length,
      total_upvotes: campaignRef.tasks.filter((task) => task.action === 'upvote').length,
      duration_ms: campaignRef.started_at && campaignRef.completed_at
        ? new Date(campaignRef.completed_at).getTime() - new Date(campaignRef.started_at).getTime()
        : 0,
    });

    broadcast(completeEvent);
  };

  const sendNextTask = () => {
    if (index >= tasks.length) {
      if (campaignRef.status !== 'completed') {
        campaignRef.status = 'in_progress';
      }
      return;
    }

    const task = tasks[index];
    const worker = workerById(task.worker_id);

    setTimeout(() => {
      if (!worker || !worker.ws || worker.status === 'offline') {
        updateTask(task.task_id, {
          status: 'failed',
          error: 'Worker disconnected before dispatch',
          completed_at: now(),
        });

        broadcast(
          addActivity({
            type: 'task_failed',
            campaign_id: task.campaign_id,
            task_id: task.task_id,
            worker_id: task.worker_id,
            worker_name: worker ? worker.name : null,
            action: task.action,
            error: 'Worker disconnected before dispatch',
          }),
        );
        finalizeCampaignIfDone(campaignRef);
      } else {
        const payload = {
          type: 'task',
          task_id: task.task_id,
          action: task.action,
          post_id: task.post_id,
          post_url: task.post_url,
          context: task.context,
        };

        try {
          worker.ws.send(JSON.stringify(payload));
          updateTask(task.task_id, {
            status: 'dispatched',
            dispatched_at: now(),
          });
          beginTaskForWorker(task.worker_id);

          broadcast(
            addActivity({
              type: 'task_dispatched',
              campaign_id: task.campaign_id,
              task_id: task.task_id,
              worker_id: task.worker_id,
              worker_name: worker.name,
              action: task.action,
            }),
          );
        } catch (error) {
          updateTask(task.task_id, {
            status: 'failed',
            error: error.message,
            completed_at: now(),
          });

          broadcast(
            addActivity({
              type: 'task_failed',
              campaign_id: task.campaign_id,
              task_id: task.task_id,
              worker_id: task.worker_id,
              worker_name: worker.name,
              action: task.action,
              error: error.message,
            }),
          );
          finalizeCampaignIfDone(campaignRef);
        }
      }

      index += 1;
      sendNextTask();
    }, Math.floor(Math.random() * 6000) + 2000);
  };

  sendNextTask();
};

module.exports = {
  assignTasksRoundRobin,
  dispatchTasks,
};
