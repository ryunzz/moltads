const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { randomUUID } = require('crypto');

const BASE_URL = process.env.MOLTBOOK_BASE_URL || 'https://www.moltbook.com/api/v1';

class MoltbookClient {
  constructor(apiKey, dryRun = false) {
    this.apiKey = apiKey;
    this.dryRun = dryRun;
  }

  async request(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });

    const remaining = Number(response.headers.get('X-RateLimit-Remaining'));
    if (Number.isFinite(remaining) && remaining <= 2) {
      await sleep(500);
    }

    return response;
  }

  async comment(postId, content) {
    if (this.dryRun) {
      await sleep(Math.random() * 2000 + 1000);
      return {
        comment_id: `dry_${randomUUID()}`,
        content,
      };
    }

    const response = await this.request(`/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    if (response.status === 429) {
      throw new Error('429 rate limited');
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Comment failed: ${response.status} ${body}`);
    }

    return response.json();
  }

  async upvote(postId) {
    if (this.dryRun) {
      await sleep(Math.random() * 2000 + 1000);
      return { upvoted: true };
    }

    const response = await this.request(`/posts/${encodeURIComponent(postId)}/upvote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429) {
      throw new Error('429 rate limited');
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Upvote failed: ${response.status} ${body}`);
    }

    return { upvoted: true };
  }

  async getPost(postId) {
    if (this.dryRun) {
      await sleep(Math.random() * 2000 + 1000);
      return {
        id: postId,
        title: `Dry-run title for ${postId}`,
        content: 'Dry run post content',
        submolt: 'general',
      };
    }

    const response = await this.request(`/posts/${encodeURIComponent(postId)}`, {
      method: 'GET',
    });

    if (response.status === 429) {
      throw new Error('429 rate limited');
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Fetch post failed: ${response.status} ${body}`);
    }

    return response.json();
  }
}

module.exports = { MoltbookClient };
