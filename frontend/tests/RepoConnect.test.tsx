import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoConnect } from '../src/components/RepoConnect';

test('submits the entered URL', async () => {
  const onConnect = vi.fn();
  render(<RepoConnect onConnect={onConnect} />);
  await userEvent.type(screen.getByLabelText('Repository URL'), 'https://github.com/a/b');
  await userEvent.click(screen.getByRole('button'));
  expect(onConnect).toHaveBeenCalledWith('https://github.com/a/b');
});

test('disables submit when input is empty', () => {
  render(<RepoConnect onConnect={vi.fn()} />);
  expect(screen.getByRole('button')).toBeDisabled();
});

test('shows analyzing state when busy', () => {
  render(<RepoConnect onConnect={vi.fn()} busy />);
  expect(screen.getByRole('button')).toHaveTextContent(/Analyzing/);
});
