import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoConnect } from '../src/components/RepoConnect';

test('submits the entered URL (no token)', async () => {
  const onConnect = vi.fn();
  render(<RepoConnect onConnect={onConnect} />);
  await userEvent.type(screen.getByLabelText('Repository URL'), 'https://github.com/a/b');
  await userEvent.click(screen.getByRole('button'));
  expect(onConnect).toHaveBeenCalledWith('https://github.com/a/b', undefined);
});

test('passes an optional access token when provided (R2AUTH)', async () => {
  const onConnect = vi.fn();
  render(<RepoConnect onConnect={onConnect} />);
  await userEvent.type(screen.getByLabelText('Repository URL'), 'https://github.com/a/b');
  await userEvent.type(screen.getByLabelText('GitHub access token (optional)'), 'ghp_secret123');
  await userEvent.click(screen.getByRole('button'));
  expect(onConnect).toHaveBeenCalledWith('https://github.com/a/b', 'ghp_secret123');
});

test('token field is a password input (not shown in plain text)', () => {
  render(<RepoConnect onConnect={vi.fn()} />);
  expect(screen.getByLabelText('GitHub access token (optional)')).toHaveAttribute('type', 'password');
});

test('disables submit when URL is empty', () => {
  render(<RepoConnect onConnect={vi.fn()} />);
  expect(screen.getByRole('button')).toBeDisabled();
});

test('shows analyzing state when busy', () => {
  render(<RepoConnect onConnect={vi.fn()} busy />);
  expect(screen.getByRole('button')).toHaveTextContent(/Analyzing/);
});
