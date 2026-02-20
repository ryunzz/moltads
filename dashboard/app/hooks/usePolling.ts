import { useEffect, useState } from 'react';
import type { CampaignSummary, Worker } from '../lib/types';
import { getCampaigns, getWorkers } from '../lib/api';

export const usePolling = (intervalMs = 3000) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!active) {
        return;
      }

      try {
        const [workersResponse, campaignsResponse] = await Promise.all([
          getWorkers(),
          getCampaigns(),
        ]);

        if (!active) {
          return;
        }

        setWorkers(workersResponse.workers || []);
        setCampaigns(campaignsResponse.campaigns || []);
      } catch {
        // keep previous state on transient errors
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, intervalMs);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return {
    workers,
    campaigns,
    isLoading,
  };
};
