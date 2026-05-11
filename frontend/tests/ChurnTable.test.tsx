import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChurnTable } from '../src/components/ChurnTable';

const rows = [
  { filePath: 'a.js', commits: 3, linesAdded: 14, linesRemoved: 1, netChange: 13, totalChurn: 15 },
  { filePath: 'd.js', commits: 2, linesAdded: 9, linesRemoved: 0, netChange: 9, totalChurn: 9 },
  { filePath: 'c.js', commits: 3, linesAdded: 27, linesRemoved: 2, netChange: 25, totalChurn: 29 }
];

test('renders one row per file', () => {
  render(<ChurnTable rows={rows} />);
  expect(screen.getByText('a.js')).toBeInTheDocument();
  expect(screen.getByText('c.js')).toBeInTheDocument();
});

test('sorts by commits by default (highest first)', () => {
  render(<ChurnTable rows={rows} />);
  const bodyRows = screen.getAllByRole('row').slice(1);
  expect(within(bodyRows[0]).getByText(/\.js$/).textContent).toMatch(/a\.js|c\.js/);
});

test('re-sorts when a column header is clicked', async () => {
  render(<ChurnTable rows={rows} />);
  await userEvent.click(screen.getByText(/Total churn/));
  const bodyRows = screen.getAllByRole('row').slice(1);
  expect(within(bodyRows[0]).getByText('c.js')).toBeInTheDocument(); // 29 is highest
});

test('shows empty state', () => {
  render(<ChurnTable rows={[]} />);
  expect(screen.getByText(/No churn data/)).toBeInTheDocument();
});
