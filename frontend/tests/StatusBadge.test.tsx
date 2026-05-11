import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../src/components/StatusBadge';

test('renders the status label', () => {
  render(<StatusBadge status="completed" />);
  expect(screen.getByRole('status')).toHaveTextContent('completed');
});

test('applies a distinct style per status', () => {
  const { rerender } = render(<StatusBadge status="failed" />);
  expect(screen.getByRole('status').className).toMatch(/rose/);
  rerender(<StatusBadge status="analyzing" />);
  expect(screen.getByRole('status').className).toMatch(/amber/);
});
