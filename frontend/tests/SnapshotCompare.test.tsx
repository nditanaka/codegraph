import { render, screen } from '@testing-library/react';
import { SnapshotCompare } from '../src/components/SnapshotCompare';

const diff = {
  added: [{ filePath: 'd.js', score: 20 }],
  removed: [{ filePath: 'b.js', score: 30 }],
  increased: [{ filePath: 'a.js', before: 300, after: 350, delta: 50 }],
  decreased: [],
  summary: { newHotspots: 1, resolvedHotspots: 1, worsened: 1, improved: 0, netScoreDelta: 40 }
};

test('shows summary counts', () => {
  render(<SnapshotCompare diff={diff} />);
  expect(screen.getByText('New hotspots')).toBeInTheDocument();
  expect(screen.getByText(/Net risk increased/)).toBeInTheDocument();
});
