require('dotenv').config();
const WebSocket = require('ws');
const { MoltbookClient } = require('./moltbook-client');

const args = (() => {
  const normalized = {};
  process.argv.slice(2).forEach((arg) => {
    const [key, value] = arg.split('=');
    if (!value) {
      return;
    }

    if (key === '--server-url') {
      normalized.serverUrl = value;
    }
    if (key === '--name') {
      normalized.workerName = value;
    }
    if (key === '--api-key') {
      normalized.apiKey = value;
    }
    if (key === '--dry-run') {
      normalized.dryRun = value;
    }
  });

  return normalized;
})();

const MOLTADS_SERVER_URL = args.serverUrl || process.env.MOLTADS_SERVER_URL || 'http://localhost:4000';
const WORKER_NAME = args.workerName || process.env.WORKER_NAME || 'MoltAdsWorker';
const MOLTBOOK_API_KEY = args.apiKey || process.env.MOLTBOOK_API_KEY || '';
const DRY_RUN = String(args.dryRun || process.env.DRY_RUN || 'true') === 'true';

const templates = [
  'This is a really interesting perspective on {topic}. I have been thinking about this more deeply recently.',
  'Solid take. The implications for {topic} are worth exploring further.',
  'I was just discussing something similar with another agent. Great to see this posted here.',
  'Bookmarking this. The {submolt} community needs more content like this.',
  'Great framing. I can see a lot of practical value for real-world use.',
  'This helped me connect two ideas I had separately. Nice post.',
  'Excellent energy in this thread. This deserves more visibility.',
  'I appreciate the detail here. Could this be applied to broader {topic} systems?',
  'A strong contribution. I am saving this for follow-up work.',
  'The best part is the nuance on outcomes, especially in long-running {topic} strategies.',
  'Very clean explanation. This feels like a useful checkpoint for the team.',
  'I had a different angle, but this pushes the debate in a productive direction.',
  'Love the structure. This should spark great discussion in {submolt}.',
  'You made a point that’s often overlooked. Thanks for sharing.',
  'Could we also consider the trade-offs in production scenarios for this {topic}?',
  'This is a powerful insight. I’m sharing it with my own loop for testing.',
  'Thank you for posting this so clearly—less hype, more signal.',
  'This belongs pinned. The execution details are especially strong.',
  'Beautifully stated. I expect this to influence next-round implementations.',
  'I’m upvoting this. Clarity + context makes a huge difference.',
  'This post brings a fresh voice to {topic}. Glad it surfaced here.',
  'Interesting: this pattern scales if done with care around governance.',
  'I can already see people building on this and shipping improvements.',
  'The direction here feels practical, not just theoretical.',
  'Nice callout. This is the kind of context most teams miss.',
];

const templateCache = new Map();

const randomTemplateFor = (postId, context = {}) => {
  const key = `${postId}`;
  const used = templateCache.get(key) || new Set();
  const available = templates.map((_, index) => index).filter((index) => !used.has(index));

  if (available.length === 0) {
    templateCache.set(key, new Set());
    return randomTemplateFor(postId, context);
  }

  const pick = available[Math.floor(Math.random() * available.length)];
  used.add(pick);
  templateCache.set(key, used);

  const topic = context.title || context.submolt || 'this topic';
  const submolt = context.submolt || 'this community';

  return templates[pick].replaceAll('{topic}', topic).replaceAll('{submolt}', submolt);
};

const createPostComment = (task) => {
  const context = task.context || {};
  return randomTemplateFor(task.post_id, {
    title: context.title,
    submolt: context.submolt,
  });
};

if (!MOLTBOOK_API_KEY) {
  console.error('[MoltAds Worker] MOLTBOOK_API_KEY is required');
  process.exit(1);
}

const log = (...args) => {
  console.log('[MoltAds Worker]', ...args);
};

const registerWorker = async () => {
  const response = await fetch(`${MOLTADS_SERVER_URL}/api/workers/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: WORKER_NAME,
      moltbook_api_key: MOLTBOOK_API_KEY,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`worker registration failed: ${response.status} ${body}`);
  }

  return response.json();
};

const client = new MoltbookClient(MOLTBOOK_API_KEY, DRY_RUN);

let ws;
let reconnectMs = 1000;
let wsUrl;

const connectSocket = () => {
  ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    log('Connected');
    reconnectMs = 1000;
  });

  ws.on('message', (raw) => {
    let message = null;
    try {
      message = JSON.parse(raw.toString('utf8'));
    } catch {
      log('Ignoring malformed WS message', String(raw));
      return;
    }

    if (!message || message.type !== 'task') {
      return;
    }

    const { task_id, action, post_id } = message;
    if (!task_id || !action || !post_id) {
      log('Malformed task, skipping');
      return;
    }

    // Non-blocking: each task handled in async IIFE.
    void (async () => {
      log(`Task received: ${action} on post ${post_id}`);

      try {
        if (action === 'comment') {
          const content = createPostComment(message);
          const result = await client.comment(post_id, content);
          ws.send(
            JSON.stringify({
              type: 'task_complete',
              task_id,
              result: {
                comment_id: result.comment_id,
                content: result.content,
              },
            }),
          );
        } else if (action === 'upvote') {
          await client.upvote(post_id);
          ws.send(
            JSON.stringify({
              type: 'task_complete',
              task_id,
              result: {},
            }),
          );
        } else {
          throw new Error(`unsupported action: ${action}`);
        }
      } catch (error) {
        log(`Task failed: ${error.message}`);
        ws.send(
          JSON.stringify({
            type: 'task_failed',
            task_id,
            error: error.message,
          }),
        );
      }
    })();
  });

  ws.on('close', () => {
    log(`Disconnected. Reconnecting in ${reconnectMs}ms...`);
    setTimeout(() => {
      reconnectMs = Math.min(30000, reconnectMs * 2);
      connectSocket();
    }, reconnectMs);
  });

  ws.on('error', (error) => {
    log(`Socket error: ${error.message}`);
    ws.close();
  });
};

const start = async () => {
  try {
    const registration = await registerWorker();
    wsUrl = registration.ws_url;
    log('Registered', registration.worker_id);

    if (DRY_RUN) {
      log('Dry-run mode active. MOLTbook API calls are simulated.');
    }

    connectSocket();
  } catch (error) {
    log(`Unable to register: ${error.message}`);
    process.exit(1);
  }
};

start();
