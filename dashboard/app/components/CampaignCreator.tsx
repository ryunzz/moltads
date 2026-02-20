'use client';

import { FormEvent, useMemo, useState } from 'react';
import { createCampaign } from '../lib/api';

type CampaignCreatorProps = {
  connectedWorkers: number;
  onCreated: () => void;
};

export const CampaignCreator = ({ connectedWorkers, onCreated }: CampaignCreatorProps) => {
  const [postUrl, setPostUrl] = useState('');
  const [comments, setComments] = useState(5);
  const [upvotes, setUpvotes] = useState(5);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUrlValid = useMemo(() => /^https?:\/\//.test(postUrl) && /moltbook/.test(postUrl), [postUrl]);

  const submitCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!isUrlValid) {
      setError('Please provide a valid MOLTbook URL.');
      return;
    }

    if (comments < 0 || upvotes < 0) {
      setError('Interaction counts must be zero or greater.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await createCampaign({
        post_url: postUrl,
        num_comments: comments,
        num_upvotes: upvotes,
      });
      setPostUrl('');
      setComments(5);
      setUpvotes(5);
      onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="moltads-campaign-creator-section"
      className="moltads-campaign-creator-section rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <h2 id="moltads-campaign-creator-title" className="moltads-campaign-creator-title mb-3 text-lg font-semibold text-slate-100">
        Amplify a Post
      </h2>
      <form id="moltads-campaign-creator-form" className="moltads-campaign-creator-form flex flex-col gap-4" onSubmit={submitCampaign}>
        <label id="moltads-campaign-creator-url-row" className="moltads-campaign-creator-url-row flex flex-col gap-1">
          <span id="moltads-campaign-creator-url-label" className="moltads-campaign-creator-url-label text-sm text-slate-300">Post URL</span>
          <input
            id="moltads-campaign-creator-url-input"
            className="moltads-campaign-creator-url-input rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none ring-0 transition focus:border-cyan-400"
            value={postUrl}
            onChange={(event) => setPostUrl(event.target.value)}
            placeholder="https://moltbook.com/post/abc123"
          />
          <span
            id="moltads-campaign-creator-url-validation"
            className={`moltads-campaign-creator-url-validation text-xs ${
              postUrl
                ? isUrlValid
                  ? 'text-emerald-300'
                  : 'text-rose-300'
                : 'text-slate-500'
            }`}
          >
            {postUrl ? (isUrlValid ? '✅ URL format looks valid' : '❌ Invalid URL format') : 'Paste a MOLTbook post URL.'}
          </span>
        </label>

        <div className="moltads-campaign-creator-counts-row flex gap-3">
          <label className="moltads-campaign-creator-comments-label-wrap flex-1">
            <span id="moltads-campaign-creator-comments-label" className="moltads-campaign-creator-comments-label text-sm text-slate-300">Comments</span>
            <input
              id="moltads-campaign-creator-comments-input"
              className="moltads-campaign-creator-comments-input w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              type="number"
              min={0}
              value={comments}
              onChange={(event) => setComments(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <label className="moltads-campaign-creator-upvotes-label-wrap flex-1">
            <span id="moltads-campaign-creator-upvotes-label" className="moltads-campaign-creator-upvotes-label text-sm text-slate-300">Upvotes</span>
            <input
              id="moltads-campaign-creator-upvotes-input"
              className="moltads-campaign-creator-upvotes-input w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              type="number"
              min={0}
              value={upvotes}
              onChange={(event) => setUpvotes(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
        </div>

        <button
          id="moltads-campaign-creator-launch-btn"
          className={`moltads-campaign-creator-launch-btn rounded-lg px-4 py-2 font-semibold text-slate-950 transition ${
            connectedWorkers > 0 && postUrl && isUrlValid && !isSubmitting
              ? 'bg-cyan-300 hover:bg-cyan-200'
              : 'cursor-not-allowed bg-slate-600'
          }`}
          type="submit"
          disabled={connectedWorkers <= 0 || !postUrl || !isUrlValid || isSubmitting}
        >
          {isSubmitting ? 'Dispatching…' : '🚀 Amplify Post'}
        </button>
      </form>

      <p id="moltads-campaign-creator-error-msg" className="moltads-campaign-creator-error-msg mt-3 text-sm text-rose-300">
        {error}
      </p>
    </section>
  );
};
