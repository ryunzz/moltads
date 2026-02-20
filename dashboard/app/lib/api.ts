const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const parseResponse = async (response: Response) => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed (${response.status})`);
  }
  return response.json();
};

export const getHealth = async () => {
  const response = await fetch(`${API_BASE}/api/health`);
  return parseResponse(response);
};

export const getWorkers = async () => {
  const response = await fetch(`${API_BASE}/api/workers`);
  return parseResponse(response);
};

export const getCampaigns = async () => {
  const response = await fetch(`${API_BASE}/api/campaigns`);
  return parseResponse(response);
};

export const getCampaign = async (campaignId: string) => {
  const response = await fetch(`${API_BASE}/api/campaigns/${campaignId}`);
  return parseResponse(response);
};

export const createCampaign = async (payload: {
  post_url: string;
  num_comments: number;
  num_upvotes: number;
}) => {
  const response = await fetch(`${API_BASE}/api/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};
