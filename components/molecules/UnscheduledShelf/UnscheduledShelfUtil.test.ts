import { BUCKET_DOT_CLASS } from '@/components/molecules/UnscheduledShelf/UnscheduledShelfUtil';
import type { Bucket } from '@/lib/domain/states';

describe('BUCKET_DOT_CLASS', () => {
  it('maps every bucket to a status token class', () => {
    const buckets: Bucket[] = ['active', 'review', 'shipping', 'planned', 'done', 'dropped'];
    for (const bucket of buckets) {
      expect(BUCKET_DOT_CLASS[bucket]).toBe(`bg-status-${bucket}`);
    }
  });
});
