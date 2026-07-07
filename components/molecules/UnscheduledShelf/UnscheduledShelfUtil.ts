// Pure helpers for the UnscheduledShelf: the bucket → status-dot color mapping used to
// tint each no-date issue chip (it has no bar, so the dot carries the bucket color).

import type { Bucket } from '@/lib/domain/states';

/** Tailwind background class (a status design token) for a bucket's chip dot. */
export const BUCKET_DOT_CLASS: Record<Bucket, string> = {
  active: 'bg-status-active',
  review: 'bg-status-review',
  shipping: 'bg-status-shipping',
  planned: 'bg-status-planned',
  triage: 'bg-status-triage',
  done: 'bg-status-done',
  dropped: 'bg-status-dropped',
};
