import { render, screen } from '@testing-library/react';
import { HotspotScatter } from '../src/components/HotspotScatter';

test('renders the chart container with data', () => {
  render(<HotspotScatter hotspots={[{ filePath: 'a.js', changeFrequency: 3, loc: 100, totalChurn: 15, score: 300, normalizedScore: 100 }]} />);
  expect(screen.getByTestId('hotspot-chart')).toBeInTheDocument();
  expect(screen.getByText(/highest risk/)).toBeInTheDocument();
});

test('shows empty state when no hotspots', () => {
  render(<HotspotScatter hotspots={[]} />);
  expect(screen.getByText(/No hotspot data/)).toBeInTheDocument();
});
