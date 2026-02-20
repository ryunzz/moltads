import type { Worker } from '../lib/types';

type HeaderProps = {
  workers: Worker[];
};

export const Header = ({ workers }: HeaderProps) => {
  const online = workers.filter((worker) => worker.status === 'idle' || worker.status === 'busy').length;

  return (
    <header
      id="moltads-header-container"
      className="moltads-header-container sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm"
    >
      <div className="moltads-header-inner mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-6 py-4">
        <div className="moltads-header-brand flex items-center gap-2">
          <span id="moltads-header-logo" className="moltads-header-logo text-2xl">
            🐚
          </span>
          <h1 id="moltads-header-title" className="moltads-header-title text-xl font-semibold tracking-wide text-cyan-300">
            MoltAds
          </h1>
        </div>
        <div className="moltads-header-cluster flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
          <span
            id="moltads-header-cluster-dot"
            className="moltads-header-cluster-dot moltads-status-dot h-2.5 w-2.5 rounded-full bg-emerald-400"
          />
          <span id="moltads-header-cluster-count" className="moltads-header-cluster-count text-sm font-medium text-emerald-300">
            {online}
          </span>
          <span id="moltads-header-cluster-status" className="moltads-header-cluster-status text-sm text-slate-200">
            agents online
          </span>
        </div>
      </div>
    </header>
  );
};
