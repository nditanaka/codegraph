import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../src/pages/Dashboard';
import { api } from '../src/api/client';

vi.mock('../src/api/client', () => ({
  api: {
    connectRepository: vi.fn(),
    getRepository: vi.fn(),
    getChurn: vi.fn(),
    getHotspots: vi.fn(),
    getCoupling: vi.fn(),
    getOwnership: vi.fn()
  }
}));

test('connects a repo, polls to completion, and shows churn results', async () => {
  const repoPending = { id: 1, url: 'u', name: 'demo', status: 'analyzing', error_message: null };
  const repoDone = { ...repoPending, status: 'completed' };
  const snap = { id: 9, repository_id: 1, commit_count: 7, file_count: 5, created_at: 1 };
  (api.connectRepository as any).mockResolvedValue(repoPending);
  (api.getRepository as any).mockResolvedValue({ repository: repoDone, snapshots: [snap] });
  (api.getChurn as any).mockResolvedValue({ churn: [{ filePath: 'c.js', commits: 3, linesAdded: 27, linesRemoved: 2, netChange: 25, totalChurn: 29 }] });
  (api.getHotspots as any).mockResolvedValue({ hotspots: [] });
  (api.getCoupling as any).mockResolvedValue({ pairs: [] });
  (api.getOwnership as any).mockResolvedValue({ files: [], authors: [] });

  render(<Dashboard />);
  await userEvent.type(screen.getByLabelText('Repository URL'), 'https://github.com/a/b');
  await userEvent.click(screen.getByRole('button'));

  await waitFor(() => expect(screen.getByText('c.js')).toBeInTheDocument(), { timeout: 3000 });
});

test('shows an error when connect fails', async () => {
  (api.connectRepository as any).mockRejectedValue(new Error('Invalid repository URL'));
  render(<Dashboard />);
  await userEvent.type(screen.getByLabelText('Repository URL'), 'garbage');
  await userEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByText('Invalid repository URL')).toBeInTheDocument());
});
