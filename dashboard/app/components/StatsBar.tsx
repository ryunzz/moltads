'use client';

import { useEffect, useState } from 'react';
import type { CampaignSummary, Worker } from '../lib/types';

const useAnimatedCounter = (target: number) => {
  const [value, setValue] = useState(target);

  useEffect(() => {
    const start = value;
    const delta = target - start;
    const duration = 600;

    if (delta === 0) {
      return;
    }

    const startedAt = performance.now();
    const tick = () => {
      const now = performance.now();
      const percent = Math.min(1, (now - startedAt) / duration);
      const next = Math.round(start + delta * percent);
      setValue(next);

      if (percent < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [target]);

  return value;
};

export const StatsBar = ({
  workers,
  campaigns,
}: {
  workers: Worker[];
  campaigns: CampaignSummary[];
}) => {
  const onlineWorkers = workers.filter((worker) => worker.status === 'idle' || worker.status === 'busy').length;
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'dispatching' || campaign.status === 'in_progress').length;
  const totalInteractions = campaigns.reduce((sum, campaign) => sum + campaign.tasks_completed + campaign.tasks_failed, 0);

  const animatedWorkers = useAnimatedCounter(onlineWorkers);
  const animatedCampaigns = useAnimatedCounter(activeCampaigns);
  const animatedInteractions = useAnimatedCounter(totalInteractions);

  return (
    <section
      id="moltads-stats-bar-container"
      className="moltads-stats-bar-container grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      <div id="moltads-stats-bar-card-workers" className="moltads-stats-bar-card-workers rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p id="moltads-stats-bar-workers-label" className="moltads-stats-bar-workers-label text-sm text-slate-400">Workers Connected</p>
        <div id="moltads-stats-bar-workers-count" className="moltads-stats-bar-workers-count text-3xl font-bold text-cyan-200">
          {animatedWorkers}
        </div>
      </div>
      <div id="moltads-stats-bar-card-campaigns" className="moltads-stats-bar-card-campaigns rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p id="moltads-stats-bar-campaigns-label" className="moltads-stats-bar-campaigns-label text-sm text-slate-400">Active Campaigns</p>
        <div id="moltads-stats-bar-campaigns-count" className="moltads-stats-bar-campaigns-count text-3xl font-bold text-amber-200">
          {animatedCampaigns}
        </div>
      </div>
      <div id="moltads-stats-bar-card-interactions" className="moltads-stats-bar-card-interactions rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p id="moltads-stats-bar-interactions-label" className="moltads-stats-bar-interactions-label text-sm text-slate-400">Total Interactions</p>
        <div id="moltads-stats-bar-interactions-count" className="moltads-stats-bar-interactions-count text-3xl font-bold text-emerald-200">
          {animatedInteractions}
        </div>
      </div>
    </section>
  );
};
