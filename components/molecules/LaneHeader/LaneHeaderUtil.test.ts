import { laneCountLabel } from '@/components/molecules/LaneHeader/LaneHeaderUtil';

describe('laneCountLabel', () => {
  it('pluralizes and handles the empty case', () => {
    expect(laneCountLabel(0)).toBe('No issues');
    expect(laneCountLabel(1)).toBe('1 issue');
    expect(laneCountLabel(4)).toBe('4 issues');
  });
});
