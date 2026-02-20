export type WorkerStatus = 'registered' | 'idle' | 'busy' | 'offline';

export type TaskStatus = 'pending' | 'dispatched' | 'completed' | 'failed';

export type TaskAction = 'comment' | 'upvote';

export interface Worker {
  id: string;
  name: string;
  status: WorkerStatus;
  tasks_completed: number;
  connected_at: string | null;
}

export interface Task {
  task_id: string;
  campaign_id: string;
  worker_id: string;
  action: TaskAction;
  post_id: string;
  status: TaskStatus;
  created_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
  result?: {
    comment_id?: string;
    content?: string;
  };
  error?: string | null;
}

export interface Campaign {
  id: string;
  post_url: string;
  status: 'created' | 'dispatching' | 'in_progress' | 'completed' | 'failed';
  tasks_total: number;
  tasks_completed: number;
  tasks_failed: number;
  created_at: string;
  tasks?: Task[];
}

export interface CampaignSummary {
  id: string;
  post_url: string;
  status: Campaign['status'];
  tasks_total: number;
  tasks_completed: number;
  tasks_failed: number;
  created_at: string;
}

export interface CampaignApiResponse {
  campaigns: CampaignSummary[];
}

export interface WorkersApiResponse {
  workers: Worker[];
}

export interface CreateCampaignRequest {
  post_url: string;
  num_comments: number;
  num_upvotes: number;
}

export interface CreateCampaignResponse {
  campaign_id: string;
  status: string;
  tasks_total: number;
  workers_available: number;
}

export interface RegisterWorkerResponse {
  worker_id: string;
  ws_url: string;
}

export interface ActivityEvent {
  event_id: string;
  timestamp: string;
  type:
    | 'worker_connected'
    | 'worker_disconnected'
    | 'campaign_created'
    | 'task_dispatched'
    | 'task_completed'
    | 'task_failed'
    | 'campaign_completed';
  worker_id?: string;
  worker_name?: string;
  campaign_id?: string;
  post_url?: string;
  tasks_total?: number;
  task_id?: string;
  action?: string;
  comment_content?: string | null;
  error?: string;
  total_comments?: number;
  total_upvotes?: number;
}
