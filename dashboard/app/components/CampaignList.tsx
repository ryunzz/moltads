import type { CampaignSummary } from '../lib/types';

const statusStyles = {
  dispatching: 'bg-sky-400 text-slate-950',
  in_progress: 'bg-amber-400 text-slate-950',
  completed: 'bg-emerald-400 text-slate-950',
  failed: 'bg-rose-500 text-slate-100',
  created: 'bg-slate-600 text-slate-100',
};

export const CampaignList = ({ campaigns }: { campaigns: CampaignSummary[] }) => {
    const ordered = [...campaigns].sort((a, b) => {
    const order = {
      created: 0,
      dispatching: 1,
      in_progress: 2,
      completed: 3,
      failed: 4,
    };

    if (a.status !== b.status) {
      return order[a.status] - order[b.status];
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <section
      id="moltads-campaign-list-section"
      className="moltads-campaign-list-section rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 id="moltads-campaign-list-title" className="moltads-campaign-list-title mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Campaigns
      </h2>
      <div id="moltads-campaign-list-container" className="moltads-campaign-list-container space-y-3">
        {ordered.length === 0 ? (
          <p id="moltads-campaign-list-empty" className="moltads-campaign-list-empty text-sm text-slate-500">
            No campaigns yet
          </p>
        ) : null}

        {ordered.map((campaign) => {
          const totalDone = campaign.tasks_completed + campaign.tasks_failed;
          const percentage = campaign.tasks_total === 0 ? 0 : Math.round((totalDone / campaign.tasks_total) * 100);
          const safePostUrl = campaign.post_url.length > 80 ? `${campaign.post_url.slice(0, 77)}...` : campaign.post_url;

          return (
            <article
              id={`moltads-campaign-list-item-${campaign.id}`}
              key={campaign.id}
              className="moltads-campaign-list-item rounded-lg border border-slate-800 bg-slate-950 p-3"
            >
              <div className="moltads-campaign-list-row mb-2 flex items-start justify-between gap-3">
                <div className="moltads-campaign-list-left flex flex-col gap-1">
                  <span id={`moltads-campaign-list-id-${campaign.id}`} className="moltads-campaign-list-id text-sm text-cyan-300">
                    {campaign.id}
                  </span>
                  <a
                    href={campaign.post_url}
                    target="_blank"
                    rel="noreferrer"
                    id={`moltads-campaign-list-post-url-${campaign.id}`}
                    className="moltads-campaign-list-post-url max-w-[450px] text-sm text-slate-200 underline decoration-slate-500 hover:text-cyan-200"
                  >
                    {safePostUrl}
                  </a>
                </div>
                <span
                  id={`moltads-campaign-list-status-badge-${campaign.id}`}
                  className={`moltads-campaign-list-status-badge moltads-status-badge rounded-full px-2 py-1 text-xs font-bold ${
                    statusStyles[campaign.status]
                  }`}
                >
                  {campaign.status}
                </span>
              </div>

              <div id={`moltads-campaign-list-progress-bar-${campaign.id}`} className="moltads-campaign-list-progress-bar h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  id={`moltads-campaign-list-progress-fill-${campaign.id}`}
                  className="moltads-campaign-list-progress-fill h-full rounded-full bg-cyan-400 transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p id={`moltads-campaign-list-tasks-count-${campaign.id}`} className="moltads-campaign-list-tasks-count mt-1 text-xs text-slate-400">
                {totalDone} / {campaign.tasks_total} tasks
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
