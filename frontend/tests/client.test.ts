import { api } from '../src/api/client';

afterEach(() => { vi.restoreAllMocks(); });

test('connectRepository POSTs and returns the repository', async () => {
  const repo = { id: 1, url: 'https://github.com/a/b', name: 'b', status: 'pending', error_message: null };
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ repository: repo }) } as any);
  const result = await api.connectRepository('https://github.com/a/b');
  expect(result).toEqual(repo);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/repositories'), expect.objectContaining({ method: 'POST' }));
});

test('connectRepository surfaces server error messages', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, json: async () => ({ error: 'Invalid repository URL' }) } as any);
  await expect(api.connectRepository('garbage')).rejects.toThrow('Invalid repository URL');
});

test('getChurn requests the window query param', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ churn: [] }) } as any);
  await api.getChurn(5, 'all');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/snapshots/5/churn?window=all'));
});
