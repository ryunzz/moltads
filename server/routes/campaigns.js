const express = require('express');

const router = express.Router();
const { workers, campaigns, createCampaign } = require('../lib/state');
const { assignTasksRoundRobin, dispatchTasks } = require('../lib/dispatcher');
const { broadcast } = require('../lib/sse');
const { addActivity } = require('../lib/state');

const extractPostId = (postUrl) => {
  if (typeof postUrl !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(postUrl);
    const queryId = parsed.searchParams.get('post_id') || parsed.searchParams.get('id');
    if (queryId) {
      return queryId;
    }

    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) {
      return parsed.pathname.replace(/\//g, '');
    }

    return pathParts[pathParts.length - 1];
  } catch (_error) {
    return postUrl.split('/').filter(Boolean).pop() || postUrl;
  }
};

const safeNumber = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

router.post('/', async (req, res) => {
  const { post_url, num_comments, num_upvotes } = req.body || {};

  if (typeof post_url !== 'string' || !post_url.trim()) {
    return res.status(400).json({ error: 'post_url is required' });
  }

  const requestedComments = safeNumber(num_comments);
  const requestedUpvotes = safeNumber(num_upvotes);
  const postId = extractPostId(post_url);

  const campaign = createCampaign({
    post_url: post_url.trim(),
    post_id: postId,
    num_comments: requestedComments,
    num_upvotes: requestedUpvotes,
  });

  const assignment = assignTasksRoundRobin({
    campaign,
    workersSource: workers,
    numComments: requestedComments,
    numUpvotes: requestedUpvotes,
  });

  campaigns.set(campaign.id, campaign);

  const event = addActivity({
    type: 'campaign_created',
    campaign_id: campaign.id,
    post_url: campaign.post_url,
    tasks_total: campaign.tasks_total,
  });
  broadcast(event);

  dispatchTasks(campaign, broadcast);

  return res.status(201).json({
    campaign_id: campaign.id,
    status: campaign.status,
    tasks_total: campaign.tasks_total,
    workers_available: assignment.workersAvailable,
  });
});

router.get('/', (_req, res) => {
  const payload = Array.from(campaigns.values()).map((campaign) => ({
    id: campaign.id,
    post_url: campaign.post_url,
    status: campaign.status,
    tasks_total: campaign.tasks_total,
    tasks_completed: campaign.tasks_completed,
    tasks_failed: campaign.tasks_failed,
    created_at: campaign.created_at,
  }));

  res.json({ campaigns: payload });
});

router.get('/:id', (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  res.json(campaign);
});

module.exports = router;
