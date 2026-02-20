import type { Worker } from '../lib/types';

type RegistryProps = {
  workers: Worker[];
};

const statusColor = {
  registered: 'bg-sky-400',
  idle: 'bg-emerald-400',
  busy: 'bg-amber-400',
  offline: 'bg-rose-400',
};

export const WorkerRegistry = ({ workers }: RegistryProps) => {
  const orderedWorkers = [...workers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section id="moltads-worker-registry-section" className="moltads-worker-registry-section rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 id="moltads-worker-registry-title" className="moltads-worker-registry-title mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Worker Registry
      </h2>
      <ul id="moltads-worker-registry-list" className="moltads-worker-registry-list max-h-[210px] space-y-2 overflow-y-auto pr-1">
        {orderedWorkers.length === 0 ? (
          <li id="moltads-worker-registry-empty" className="moltads-worker-registry-empty text-sm text-slate-500">
            No workers connected yet
          </li>
        ) : null}
        {orderedWorkers.map((worker) => (
          <li
            id={`moltads-worker-registry-item-${worker.id}`}
            key={worker.id}
            className="moltads-worker-registry-item flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-2"
          >
            <div className="moltads-worker-registry-item-left flex items-center gap-2">
              <span
                id={`moltads-worker-registry-dot-${worker.id}`}
                className={`moltads-worker-registry-dot moltads-status-dot h-2.5 w-2.5 rounded-full ${
                  statusColor[worker.status]
                }`}
                style={{
                  animation: worker.status === 'offline' ? 'none' : 'moltads-status-pulse 1.6s infinite',
                }}
              />
              <span id={`moltads-worker-registry-name-${worker.id}`} className="moltads-worker-registry-name text-sm font-medium text-slate-100">
                {worker.name}
              </span>
            </div>
            <div className="moltads-worker-registry-meta flex items-center gap-2 text-xs text-slate-400">
              <span id={`moltads-worker-registry-status-${worker.id}`} className="moltads-worker-registry-status capitalize">
                {worker.status}
              </span>
              <span id={`moltads-worker-registry-tasks-${worker.id}`} className="moltads-worker-registry-tasks">
                {worker.tasks_completed} done
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
