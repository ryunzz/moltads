'use client';

import { useMemo } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { CampaignCreator } from './components/CampaignCreator';
import { WorkerRegistry } from './components/WorkerRegistry';
import { ActivityFeed } from './components/ActivityFeed';
import { CampaignList } from './components/CampaignList';
import { usePolling } from './hooks/usePolling';
import { useSSE } from './hooks/useSSE';

export default function Dashboard() {
  const { workers, campaigns, isLoading } = usePolling(3000);
  const { events } = useSSE();

  const connectedWorkers = useMemo(() => workers.filter((worker) => worker.status === 'idle' || worker.status === 'busy').length, [workers]);

  return (
    <main id="moltads-dashboard-shell" className="moltads-dashboard-shell min-h-screen bg-slate-950 text-slate-100">
      <Header workers={workers} />

      <section id="moltads-dashboard-content" className="moltads-dashboard-content mx-auto flex w-full max-w-[1400px] flex-col gap-4 p-4 md:p-6">
        <div id="moltads-dashboard-top-grid" className="moltads-dashboard-top-grid grid gap-4 lg:grid-cols-[320px,1fr]">
          <StatsBar workers={workers} campaigns={campaigns} />
          <CampaignCreator
            connectedWorkers={connectedWorkers}
            onCreated={() => {
              // no-op: SSE and polling will refresh lists automatically.
            }}
          />
        </div>

        <div id="moltads-dashboard-middle-grid" className="moltads-dashboard-middle-grid grid gap-4 lg:grid-cols-[320px,1fr]">
          <WorkerRegistry workers={workers} />
          <ActivityFeed events={events} />
        </div>

        <div id="moltads-dashboard-bottom-row" className="moltads-dashboard-bottom-row">
          <CampaignList campaigns={campaigns} />
        </div>
      </section>

      {isLoading ? (
        <p id="moltads-dashboard-loading" className="moltads-dashboard-loading fixed bottom-4 right-4 rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
          Loading dashboard data...
        </p>
      ) : null}
    </main>
  );
}
