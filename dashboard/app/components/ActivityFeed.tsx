import type { ActivityEvent } from '../lib/types';
import { useEffect, useRef } from 'react';

type ActivityFeedProps = {
  events: ActivityEvent[];
};

const actionText = (event: ActivityEvent) => {
  if (event.type === 'task_completed') {
    return `${event.worker_name || 'Unknown'} ${event.action === 'comment' ? 'commented' : 'upvoted'}`;
  }

  if (event.type === 'task_failed') {
    return `${event.worker_name || 'Unknown'} failed ${event.action || 'action'}`;
  }

  if (event.type === 'campaign_created') {
    return `Campaign created: ${event.campaign_id}`;
  }

  if (event.type === 'worker_connected') {
    return `${event.worker_name || 'Unknown'} connected`;
  }

  if (event.type === 'worker_disconnected') {
    return `${event.worker_name || 'Unknown'} disconnected`;
  }

  if (event.type === 'campaign_completed') {
    return `Campaign ${event.campaign_id} completed`;
  }

  return event.type;
};

export const ActivityFeed = ({ events }: ActivityFeedProps) => {
  const scrollContainer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollContainer.current;
    if (container) {
      container.scrollTop = 0;
    }
  }, [events]);

  return (
    <section
      id="moltads-activity-feed-section"
      className="moltads-activity-feed-section flex h-[310px] flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 id="moltads-activity-feed-title" className="moltads-activity-feed-title mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Live Activity
      </h2>
      <div
        id="moltads-activity-feed-scroll-container"
        ref={scrollContainer}
        className="moltads-activity-feed-scroll-container flex-1 space-y-2 overflow-y-auto pr-1"
      >
        {events.length === 0 ? (
          <p id="moltads-activity-feed-empty" className="moltads-activity-feed-empty text-sm text-slate-500">
            Waiting for events...
          </p>
        ) : null}
        {events.map((event) => {
          const descriptor = event.event_id || `fallback-${event.timestamp}`;
          return (
            <div
              id={`moltads-activity-feed-event-${descriptor}`}
              key={event.event_id}
              className="moltads-activity-feed-event animate-moltads-slide-down rounded-lg border border-slate-800 bg-slate-950 p-2"
            >
              <p id={`moltads-activity-feed-event-time-${descriptor}`} className="moltads-activity-feed-event-time text-xs text-slate-500">
                {new Date(event.timestamp).toLocaleTimeString()}
              </p>
              <p className="moltads-activity-feed-event-line mt-0.5 text-sm text-slate-200">
                <span id={`moltads-activity-feed-event-agent-${descriptor}`} className="moltads-activity-feed-event-agent font-semibold text-cyan-300">
                  {event.worker_name || event.campaign_id || 'System'}
                </span>
                {' '}
                <span id={`moltads-activity-feed-event-action-${descriptor}`} className="moltads-activity-feed-event-action">
                  {actionText(event)}
                </span>
              </p>
              {event.comment_content ? (
                <p id={`moltads-activity-feed-event-preview-${descriptor}`} className="moltads-activity-feed-event-preview mt-1 text-xs text-slate-300">
                  {event.comment_content}
                </p>
              ) : null}
              {event.error ? (
                <p id={`moltads-activity-feed-event-error-${descriptor}`} className="moltads-activity-feed-event-error mt-1 text-xs text-rose-300">
                  {event.error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};
